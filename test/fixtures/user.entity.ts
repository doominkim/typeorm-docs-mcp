import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BlogPost } from "./blog-post.entity";

/**
 * 서비스 사용자 계정.
 *
 * @namespace Accounts
 * @erd Blog
 */
@Entity({ name: "users", comment: "서비스 사용자 계정" })
export class User {
  /** 사용자 고유 식별자 */
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  /** 로그인 이메일 */
  @Column({ type: "varchar", unique: true })
  email!: string;

  /** 표시 이름 */
  @Column({ name: "display_name", type: "varchar" })
  displayName!: string;

  @Column({ type: "varchar", select: false })
  passwordHash!: string;

  /** 작성한 게시글 목록 */
  @OneToMany(() => BlogPost, (post) => post.author)
  posts!: BlogPost[];
}
