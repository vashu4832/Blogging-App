import { Hono } from "hono";
import { PrismaClient } from "../../generated/prisma/client";
import { withAccelerate } from '@prisma/extension-accelerate'
import { verify } from "hono/jwt";
import { pseudoRandomBytes } from "node:crypto";

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
}>();

blogRouter.use('/*', async (c, next) => {
    try {
        const header = c.req.header("authorization") || "";
        const user = await verify(header, c.env.JWT_SECRET, 'HS256');

        if (user) {
            c.set("userId", user.id as string)
            await next()
        } else {
            c.status(403)
            return c.json({ error: "unauthorized" })
        }
    } catch(err) {
        return c.json({
            err: "Unauthorized"
        }, 403)
    }
})

blogRouter.post("/", async (c) => {
    // Create a new blog
    const prisma = new PrismaClient({
        accelerateUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const authorId = c.get("userId");
    const body = await c.req.json();
    const post = await prisma.post.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: authorId
        }
    })

    return c.json({
        id: post.id
    });
})

blogRouter.put("/", async (c) => {
    // Update a existing blog
    const prisma = new PrismaClient({
        accelerateUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    try {
        const body = await c.req.json();
        const post = await prisma.post.update({
            where: {
                id: body.id
            },
            data: {
                title: body.title,
                content: body.content,
            }
        })
        return c.json({
            id: post.id
        });
    } catch (err) {
        c.status(404);
        return c.json({
            error: "Unable to update"
        })
    }
})

// Task -> add pagination
blogRouter.get("/bulk", async (c) => {
    const prisma = new PrismaClient({
        accelerateUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const blog = await prisma.post.findMany();
    return c.json({
        blog
    })
})

blogRouter.get("/:id", async (c) => {
    // Get a specific blog
    const prisma = new PrismaClient({
        accelerateUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());
    try {
        const id = c.req.param("id");
        const post = await prisma.post.findFirst({
            where: {
                id
            }
        })

        return c.json({
            post
        });
    } catch (err) {
        c.status(411);
        return c.json({
            error: "Error while fetching blog post"
        })
    }
})

