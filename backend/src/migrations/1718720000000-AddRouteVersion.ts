import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRouteVersion1718720000000 implements MigrationInterface {
    name = 'AddRouteVersion1718720000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`route_version\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`route_id\` int NOT NULL,
                \`version\` int NOT NULL,
                \`change_type\` enum ('grade', 'holds', 'status', 'path_coords', 'multiple', 'rollback') NOT NULL,
                \`change_description\` varchar(500) NULL,
                \`snapshot\` json NOT NULL,
                \`changed_fields\` text NULL,
                \`created_by\` int NULL,
                \`parent_version_id\` int NULL,
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`idx_route_version_route_version\` (\`route_id\`, \`version\`),
                INDEX \`idx_route_version_route\` (\`route_id\`),
                INDEX \`idx_route_version_created_by\` (\`created_by\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            ALTER TABLE \`route_version\`
            ADD CONSTRAINT \`FK_route_version_route\` FOREIGN KEY (\`route_id\`) REFERENCES \`route\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`route_version\`
            ADD CONSTRAINT \`FK_route_version_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE \`route_version\`
            ADD CONSTRAINT \`FK_route_version_parent\` FOREIGN KEY (\`parent_version_id\`) REFERENCES \`route_version\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`route_version\` DROP FOREIGN KEY \`FK_route_version_parent\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`route_version\` DROP FOREIGN KEY \`FK_route_version_created_by\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`route_version\` DROP FOREIGN KEY \`FK_route_version_route\`
        `);
        await queryRunner.query(`
            DROP INDEX \`idx_route_version_created_by\` ON \`route_version\`
        `);
        await queryRunner.query(`
            DROP INDEX \`idx_route_version_route\` ON \`route_version\`
        `);
        await queryRunner.query(`
            DROP INDEX \`idx_route_version_route_version\` ON \`route_version\`
        `);
        await queryRunner.query(`
            DROP TABLE \`route_version\`
        `);
    }
}
