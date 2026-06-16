const express = require('express');
const usersController = require('../../controllers/users.controller');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');
const {
  userParamSchema,
  listUsersSchema,
  updateUserSchema,
} = require('../../validators/users.validator');

const router = express.Router();

router.get('/', requireAuth, requireRole('admin'), validate(listUsersSchema), usersController.listUsers);
router.put('/:id', requireAuth, requireRole('admin'), validate(updateUserSchema), usersController.updateUser);
router.delete('/:id', requireAuth, requireRole('admin'), validate(userParamSchema), usersController.deleteUser);

module.exports = router;
