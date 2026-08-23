import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokens1787489645185 implements MigrationInterface {
  name = "AddRefreshTokens1787489645185";

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"
        `);
    await queryRunner.query(`
            DROP TABLE "refresh_tokens"
        `);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "refresh_tokens" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "token_hash" character varying NOT NULL,
                "userId" uuid,
                CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash")
        `);
    await queryRunner.query(`
            ALTER TABLE "refresh_tokens"
            ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }
}
