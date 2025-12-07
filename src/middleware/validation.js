const Joi = require('joi');
const logger = require('../utils/logger');

const validationOptions = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true
};

const uploadSchema = Joi.object({
    file: Joi.object({
        fieldname: Joi.string().valid('file').required(),
        originalname: Joi.string().required(),
        mimetype: Joi.string().valid('text/csv').required(),
        size: Joi.number().max(5 * 1024 * 1024) // 5MB max
    }).unknown()
});

const verifySchema = Joi.object({
    entry: Joi.object().required(),
    proof: Joi.array().items(Joi.string()).required(),
    rootHash: Joi.string().required()
});

const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req, {
            ...validationOptions,
            context: { method: req.method }
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.context.key,
                message: detail.message.replace(/['"]/g, '')
            }));

            logger.warn('Validation failed', { errors });
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        // Replace req with validated and sanitized values
        Object.assign(req, value);
        return next();
    };
};

module.exports = {
    validateUpload: validate(uploadSchema),
    validateVerification: validate(verifySchema)
};
