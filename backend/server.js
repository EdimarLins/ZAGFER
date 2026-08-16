import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001; // Changed to 3001 to avoid React conflict

app.use(cors());
app.use(express.json());

// Database setup
// Force BIGINT (type 20) to be parsed as numbers (for timestamps)
pg.types.setTypeParser(20, (val) => parseInt(val, 10));

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'zagfer',
    password: process.env.DB_PASSWORD || 'zagardb',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const pool = new pg.Pool(poolConfig);

// Initialize Database Schema
const initDb = async () => {
    try {
        // Step 1: Ensure database exists
        // We need to connect to the default 'postgres' database to check/create the target database
        const tempPool = new pg.Pool({
            ...poolConfig,
            database: 'postgres',
        });

        try {
            const client = await tempPool.connect();
            const dbCheck = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [poolConfig.database]);

            if (dbCheck.rows.length === 0) {
                console.log(`Database ${poolConfig.database} not found. Creating...`);
                await client.query(`CREATE DATABASE "${poolConfig.database}"`);
                console.log(`Database ${poolConfig.database} created successfully.`);
            } else {
                console.log(`Database ${poolConfig.database} already exists.`);
            }
            client.release();
        } catch (err) {
            console.error('Error checking/creating database:', err);
            // Verify if the error is actually because the DB doesn't exist and we couldn't connect to 'postgres' to create it.
            // But if we can't connect to 'postgres', we probably can't do anything.
        } finally {
            await tempPool.end();
        }


        // Step 2: Initialize Schema in the target database
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schema);
        console.log('Database schema initialized.');

        // Step 3: Ensure force_reset column exists
        try {
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='force_reset') THEN
                        ALTER TABLE users ADD COLUMN force_reset BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
            `);
            console.log('Checked/Created force_reset column.');
        } catch (err) {
            console.error('Error adding force_reset column:', err);
        }

        // Step 4: Update action_type constraint for RENEWAL
        try {
            await pool.query(`
                DO $$
                BEGIN
                    -- Check if the constraint exists and update it if necessary
                    IF EXISTS (
                        SELECT 1 FROM information_schema.check_constraints 
                        WHERE constraint_name = 'history_action_type_check'
                    ) THEN
                        -- Dropping and re-creating is safer than trying to alter the check expression directly
                        ALTER TABLE history DROP CONSTRAINT history_action_type_check;
                    END IF;
                    
                    ALTER TABLE history ADD CONSTRAINT history_action_type_check 
                        CHECK (action_type IN ('CHECKOUT', 'RETURN', 'RENEWAL'));
                END $$;
            `);
            console.log('Checked/Updated history action_type constraint.');
        } catch (err) {
            console.error('Error updating history constraint:', err);
        }

        // Step 5: Update dispatcher_id FK to ON DELETE SET NULL
        // This allows deleting users even if they have history records
        try {
            await pool.query(`
                DO $$
                DECLARE
                    fk_name TEXT;
                BEGIN
                    -- Find the name of the existing FK constraint on history.dispatcher_id
                    SELECT tc.constraint_name INTO fk_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = 'history'
                        AND tc.constraint_type = 'FOREIGN KEY'
                        AND kcu.column_name = 'dispatcher_id'
                    LIMIT 1;

                    IF fk_name IS NOT NULL THEN
                        EXECUTE 'ALTER TABLE history DROP CONSTRAINT ' || fk_name;
                    END IF;

                    -- Re-create with ON DELETE SET NULL so deleting a user preserves history
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE table_name = 'history'
                          AND constraint_name = 'history_dispatcher_id_fkey_set_null'
                    ) THEN
                        ALTER TABLE history
                            ADD CONSTRAINT history_dispatcher_id_fkey_set_null
                            FOREIGN KEY (dispatcher_id) REFERENCES users(id) ON DELETE SET NULL;
                    END IF;
                END $$;
            `);
            console.log('Checked/Updated dispatcher_id FK to ON DELETE SET NULL.');
        } catch (err) {
            console.error('Error updating dispatcher_id FK constraint:', err);
        }

        // Step 6: Ensure received_by_name column exists in history
        try {
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='history' AND column_name='received_by_name') THEN
                        ALTER TABLE history ADD COLUMN received_by_name TEXT;
                    END IF;
                END $$;
            `);
            console.log('Checked/Created received_by_name column.');
        } catch (err) {
            console.error('Error adding received_by_name column:', err);
        }
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

initDb();

// --- API ROUTES ---

// Tools
app.get('/api/tools', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tools ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tools', async (req, res) => {
    const { name, category, size, bmp, sector, status } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO tools (name, category, size, bmp, sector, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, category, size, bmp, sector, status]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tools/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, size, bmp, sector, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE tools SET name = $1, category = $2, size = $3, bmp = $4, sector = $5, status = $6 WHERE id = $7 RETURNING *',
            [name, category, size, bmp, sector, status, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tools/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tools WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, matricula, active, role FROM users ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Setup Status & Master Setup Routes
app.get('/api/auth/setup-status', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(result.rows[0].count, 10);
        res.json({ setupRequired: userCount === 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/setup-master', async (req, res) => {
    const { name, matricula, password } = req.body;

    if (!name || !matricula || !password) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios (Nome, Matrícula, Senha).' });
    }

    try {
        // Double check setup is required
        const check = await pool.query('SELECT COUNT(*) FROM users');
        const userCount = parseInt(check.rows[0].count, 10);
        if (userCount > 0) {
            return res.status(400).json({ error: 'O usuário mestre já foi configurado no sistema.' });
        }

        // Insert Master Admin User
        const result = await pool.query(
            'INSERT INTO users (name, matricula, password, role, active, force_reset) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name.trim(), matricula.trim(), password, 'admin', true, false]
        );

        const createdUser = result.rows[0];
        const { password: _, ...userWithoutPassword } = createdUser;

        res.status(201).json({
            user: userWithoutPassword,
            session: { access_token: 'dummy_token' },
            message: 'Usuário Mestre criado com sucesso!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { matricula, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.password === password) { // Plain text for simplicity as requested, TODO: Hash
                if (user.force_reset) {
                    return res.status(403).json({ error: 'Password reset required', forceReset: true });
                }
                const { password, ...userWithoutPassword } = user;
                res.json({ user: userWithoutPassword, session: { access_token: 'dummy_token' } }); // Mock Supabase session structure
            } else {
                res.status(401).json({ error: 'Invalid password' });
            }
        } else {
            res.status(401).json({ error: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/first-access', async (req, res) => {
    const { matricula, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.force_reset) {
                // Update password and clear force_reset
                const updateResult = await pool.query(
                    'UPDATE users SET password = $1, force_reset = FALSE WHERE id = $2 RETURNING *',
                    [password, user.id]
                );
                const { password: _, ...updatedUser } = updateResult.rows[0];
                res.json({ user: updatedUser, message: 'Senha cadastrada com sucesso!' });
            } else {
                res.status(400).json({ error: 'Usuário não está pendente de primeiro acesso.' });
            }
        } else {
            res.status(404).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/reset', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE users SET password = 'change_me', force_reset = TRUE WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length > 0) {
            res.json({ message: 'Senha resetada com sucesso forçando primeiro acesso.' });
        } else {
            res.status(404).json({ error: 'Usuário não encontrado' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { name, matricula, password, role, active } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
    }
    if (!matricula || !matricula.trim()) {
        return res.status(400).json({ error: 'A matrícula é obrigatória.' });
    }
    const cleanName = name.trim();
    const cleanMatricula = matricula.trim();

    try {
        // Verificar se matricula ou nome já está em uso (case-insensitive)
        const checkResult = await pool.query(
            'SELECT id, name, matricula FROM users WHERE LOWER(TRIM(matricula)) = LOWER($1) OR LOWER(TRIM(name)) = LOWER($2)',
            [cleanMatricula, cleanName]
        );

        if (checkResult.rows.length > 0) {
            const existing = checkResult.rows[0];
            if (existing.matricula.trim().toLowerCase() === cleanMatricula.toLowerCase()) {
                return res.status(400).json({ error: 'Não é possível criar: a matrícula/login já está em uso por outro usuário.' });
            }
            if (existing.name.trim().toLowerCase() === cleanName.toLowerCase()) {
                return res.status(400).json({ error: 'Não é possível criar: o nome já está em uso por outro usuário.' });
            }
        }

        // If password is not provided, use default and force reset
        const finalPassword = password || 'change_me';
        const forceReset = !password; // If no password provided, force reset

        const result = await pool.query(
            'INSERT INTO users (name, matricula, password, role, active, force_reset) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [cleanName, cleanMatricula, finalPassword, role || 'user', active !== undefined ? active : true, forceReset]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Matrícula/login já está em uso.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, matricula, role, active } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'O nome é obrigatório.' });
    }
    if (!matricula || !matricula.trim()) {
        return res.status(400).json({ error: 'A matrícula é obrigatória.' });
    }
    const cleanName = name.trim();
    const cleanMatricula = matricula.trim();

    try {
        // Verificar se a nova matrícula ou nome pertence a outro usuário
        const checkResult = await pool.query(
            'SELECT id, name, matricula FROM users WHERE (LOWER(TRIM(matricula)) = LOWER($1) OR LOWER(TRIM(name)) = LOWER($2)) AND id != $3',
            [cleanMatricula, cleanName, id]
        );

        if (checkResult.rows.length > 0) {
            const existing = checkResult.rows[0];
            if (existing.matricula.trim().toLowerCase() === cleanMatricula.toLowerCase()) {
                return res.status(400).json({ error: 'A matrícula/login informada já está em uso por outro usuário.' });
            }
            if (existing.name.trim().toLowerCase() === cleanName.toLowerCase()) {
                return res.status(400).json({ error: 'O nome informado já está em uso por outro usuário.' });
            }
        }

        const result = await pool.query(
            'UPDATE users SET name = $1, matricula = $2, role = $3, active = $4 WHERE id = $5 RETURNING *',
            [cleanName, cleanMatricula, role, active, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Matrícula/login já está em uso.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Actions
app.post('/api/admin/clear-tools', async (req, res) => {
    const { matricula, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE matricula = $1', [matricula]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (user.role === 'admin' && user.password === password) {
                await pool.query('TRUNCATE tools');
                res.json({ message: 'Todas as ferramentas foram apagadas com sucesso.' });
            } else {
                res.status(401).json({ error: 'Acesso negado ou senha incorreta.' });
            }
        } else {
            res.status(404).json({ error: 'Usuário não encontrado.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// History
app.get('/api/history', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id, 
                timestamp, 
                action_type as "actionType", 
                dispatcher_id as "dispatcherId", 
                dispatcher_name as "dispatcherName", 
                dispatcher_matricula as "dispatcherMatricula", 
                responsible_name as "responsibleName", 
                responsible_matricula as "responsibleMatricula", 
                tool_ids as "toolIds", 
                tools_summary as "toolsSummary", 
                expected_return_date as "expectedReturnDate",
                received_by_name as "receivedByName"
            FROM history 
            ORDER BY timestamp DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/history', async (req, res) => {
    const { timestamp, actionType, dispatcherId, dispatcherName, dispatcherMatricula, responsibleName, responsibleMatricula, toolIds, toolsSummary, expectedReturnDate, receivedByName } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO history (
                timestamp, action_type, dispatcher_id, dispatcher_name, dispatcher_matricula, 
                responsible_name, responsible_matricula, tool_ids, tools_summary, expected_return_date, received_by_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
            RETURNING 
                id, 
                timestamp, 
                action_type as "actionType", 
                dispatcher_id as "dispatcherId", 
                dispatcher_name as "dispatcherName", 
                dispatcher_matricula as "dispatcherMatricula", 
                responsible_name as "responsibleName", 
                responsible_matricula as "responsibleMatricula", 
                tool_ids as "toolIds", 
                tools_summary as "toolsSummary", 
                expected_return_date as "expectedReturnDate",
                received_by_name as "receivedByName"`,
            [timestamp, actionType, dispatcherId, dispatcherName, dispatcherMatricula, responsibleName, responsibleMatricula, toolIds, toolsSummary, expectedReturnDate, receivedByName]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/history/:id', async (req, res) => {
    const { id } = req.params;
    const { expectedReturnDate } = req.body;
    try {
        const result = await pool.query(
            'UPDATE history SET expected_return_date = $1 WHERE id = $2 RETURNING *',
            [expectedReturnDate, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'History record not found' });
        }
        // Map back to camelCase for frontend consistency
        const row = result.rows[0];
        const mappedResult = {
            id: row.id,
            timestamp: parseInt(row.timestamp), // Ensure number
            actionType: row.action_type,
            dispatcherId: row.dispatcher_id,
            dispatcherName: row.dispatcher_name,
            dispatcherMatricula: row.dispatcher_matricula,
            responsibleName: row.responsible_name,
            responsibleMatricula: row.responsible_matricula,
            toolIds: row.tool_ids,
            toolsSummary: row.tools_summary,
            expectedReturnDate: row.expected_return_date ? parseInt(row.expected_return_date) : null,
            receivedByName: row.received_by_name || null
        };
        res.json(mappedResult);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


const host = process.env.HOST || '0.0.0.0';
const server = app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
});
const distPath = path.join(__dirname, '..', 'dist');

if (fs.existsSync(distPath)) {
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    // Standard wildcard route for SPA (Single Page Application)
    app.get('*', (req, res) => {
        // If the request is looking for an API route that doesn't exist, return 404
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API route not found' });
        }
        res.sendFile(path.join(distPath, 'index.html'));
    });
}
