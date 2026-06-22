import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFollowCounts1719000000000 implements MigrationInterface {
    name = 'AddFollowCounts1719000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`user\`
            ADD COLUMN \`following_count\` int NOT NULL DEFAULT 0
        `);
        await queryRunner.query(`
            ALTER TABLE \`user\`
            ADD COLUMN \`follower_count\` int NOT NULL DEFAULT 0
        `);

        await queryRunner.query(`
            UPDATE \`user\` u
            SET u.following_count = (
                SELECT COUNT(*) FROM \`user_follow\` f WHERE f.follower_id = u.id
            )
        `);
        await queryRunner.query(`
            UPDATE \`user\` u
            SET u.follower_count = (
                SELECT COUNT(*) FROM \`user_follow\` f WHERE f.following_id = u.id
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`user\` DROP COLUMN \`follower_count\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`user\` DROP COLUMN \`following_count\`
        `);
    }
}
