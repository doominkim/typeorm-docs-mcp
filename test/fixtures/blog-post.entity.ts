import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";

/**
 * 블로그 게시글.
 *
 * @namespace Blog
 */
@Entity("blog_posts")
export class BlogPost {
  /** 게시글 ID */
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  /** 작성자 ID */
  @Column({ name: "author_id", type: "uuid" })
  authorId!: string;

  /** 게시글 제목 */
  @Column({ type: "varchar", nullable: true })
  title!: string | null;

  @Column({ type: "text" })
  body!: string;

  /** 게시글 작성자 */
  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: "author_id" })
  author!: User;
}
