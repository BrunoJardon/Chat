import { loginRequestSchema, registerRequestSchema } from "@chat/shared/auth";
import { Router } from "express";
import { z } from "zod";

import { InvalidCredentialsError, loginUser, RegisterConflictError, registerUser } from "../services/auth.service.js";

const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  const parsed = registerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    res.status(400).json({
      errors: { fields: flattened.fieldErrors, form: flattened.formErrors },
    });
    return;
  }

  try {
    const user = await registerUser(parsed.data);
    res.status(201).json({ user });
    return;
  } catch (error) {
    if (error instanceof RegisterConflictError) {
      res.status(409).json({ field: error.field, message: error.message });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    const flattened = z.flattenError(parsed.error);
    res.status(400).json({
      errors: { fields: flattened.fieldErrors, form: flattened.formErrors },
    });
    return;
  }

  try {
    const auth = await loginUser(parsed.data);
    res.status(200).json(auth);
    return;
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      res.status(401).json({ message: error.message });
      return;
    }
    next(error);
  }
});

export default authRouter;
