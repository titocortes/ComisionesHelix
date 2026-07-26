import "dotenv/config";
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(process.env.DATABASE_URL),
});
async function main() {
    const adminRole = await prisma.userRole.upsert({
        where: { idUserRole: 1 },
        update: {},
        create: { roleName: 'Admin' },
    });
    await prisma.user.upsert({
        where: { userEmail: 'admin@alliantfed.us' },
        update: {},
        create: {
            firstName: 'Admin',
            lastName: 'Alliant',
            userEmail: 'admin@alliantfed.us',
            password: await bcrypt.hash('Admin1234!', 10),
            securityLevel: 1,
            active: true,
            idUserRole: adminRole.idUserRole,
        },
    });
    console.log('Seed completed.');
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map