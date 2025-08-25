import { Hono } from "hono";

const app = new Hono();

export default {
  port: 5468,
  fetch: app.fetch,
};
