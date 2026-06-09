const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const upload = require('../config/multer');
const { getMe, submitKyc, updateProfileText } = require('../controllers/userController');

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

// Todas las rutas de usuarios requieren autenticación
router.use(authenticate);

/**
 * GET /users/me
 */
router.get('/me', getMe);

/**
 * POST /users/me/kyc
 * multipart/form-data con campos + archivos dni_front / dni_back
 */
router.post(
  '/me/kyc',
  upload.fields([
    { name: 'dni_front', maxCount: 1 },
    { name: 'dni_back', maxCount: 1 },
  ]),
  [
    body('first_name').trim().notEmpty().withMessage('Nombre requerido'),
    body('last_name').trim().notEmpty().withMessage('Apellido requerido'),
    body('legal_address').trim().notEmpty().withMessage('Domicilio requerido'),
  ],
  validate,
  submitKyc
);

/**
 * PUT /users/me
 * Modificar datos personales
 */
router.put(
  '/me',
  [
    body('first_name').notEmpty().withMessage('El nombre es requerido'),
    body('last_name').notEmpty().withMessage('El apellido es requerido'),
  ],
  validate,
  updateProfileText
);

module.exports = router;
