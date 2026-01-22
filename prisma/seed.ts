import path from 'path';
import fs from 'fs';

async function main() {
    console.log('Seeding database with Hashed Passwords...');
    const dbPath = path.join(__dirname, '../db.json');

    // Hash "123"
    const { hash } = require('bcryptjs');
    const hashedPwd = await hash("123", 10);

    const initialData: any = {
        agencies: [
            { id: 'tejwal', name: 'تجوال (الوكالة الأم)' },
            { id: 'agency-a', name: 'وكالة النور (A)' },
            { id: 'agency-b', name: 'وكالة الأمل (B)' }
        ],
        users: [
            { id: 'u1', username: 'admin', password: hashedPwd, name: 'المدير العام', role: 'ADMIN', agencyId: 'tejwal', createdAt: new Date().toISOString() },
            { id: 'u2', username: 'visa_mgr', password: hashedPwd, name: 'مسؤول التأشيرات', role: 'VISA_MANAGER', agencyId: 'tejwal', createdAt: new Date().toISOString() },
            { id: 'u3', username: 'emp_tejwal', password: hashedPwd, name: 'موظف تجوال', role: 'EMPLOYEE', agencyId: 'tejwal', createdAt: new Date().toISOString() },
            { id: 'u4', username: 'agent_a', password: hashedPwd, name: 'مدير وكالة النور', role: 'AGENCY_MANAGER', agencyId: 'agency-a', createdAt: new Date().toISOString() },
            { id: 'u5', username: 'user_a', password: hashedPwd, name: 'موظف وكالة النور', role: 'AGENCY_USER', agencyId: 'agency-a', createdAt: new Date().toISOString() },
            { id: 'u6', username: 'agent_b', password: hashedPwd, name: 'مدير وكالة الأمل', role: 'AGENCY_MANAGER', agencyId: 'agency-b', createdAt: new Date().toISOString() },
        ],
        appointments: [
            { id: 'apt-1', code: 'APP-001', country: 'France', date: '2025-02-10T09:00:00.000Z', capacity: 5, status: 'OPEN' },
            { id: 'apt-2', code: 'APP-002', country: 'Germany', date: '2025-02-15T10:00:00.000Z', capacity: 3, status: 'OPEN' },
            { id: 'apt-3', code: 'APP-CLOSED', country: 'Italy', date: '2025-01-01T09:00:00.000Z', capacity: 2, status: 'CLOSED' },
        ],
        cases: [],
        amendmentRequests: [],
        webhookLogs: []
    };

    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
    console.log('Database seeded.');
}

main().catch(console.error);
