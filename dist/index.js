"use strict";
// This middleware is designed to validate incoming requests based on predefined rules.
// It follows a specific folder structure and file naming convention.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Folder Structure:
// The project should have a folder named "modules" inside the "src" directory.
// Each API should have its own subfolder inside "modules" (e.g., src/modules/apiName).
// File Structure:
// Each API subfolder should contain a file named "requestFormat.ts".
// This file should define the validation rules for that specific API.
// Validation Rules Format:
// The validation rules in the "requestFormat.ts" file should follow this format:
// required-optional | dataType | regexPattern | minValue-maxValue | length | allowedValues
// Examples:
// "required|string|^[a-zA-Z]+$" - Required string field with a regex pattern
// "optional|int|^\\d+$|1-100" - Optional integer field with a regex pattern and min-max range
// "required|array+string" - Required array of strings
// Nested Fields:
// To validate nested fields, use the "**" notation followed by the field name.
// Example: "**.first_name:required|string" - Validates the "first_name" field at any nesting level.
// Array Data Types:
// For array data types, specify the data type using the "dataType+number" or "dataType+string" format.
// Example: "required|array+int" - Required array of integers
// Request Data Merging:
// After validation, the data from req.body, req.query, and req.params will be merged and assigned to req.input.
// URL Handling:
// If there is a redirect URL defined in app.ts (e.g., app.use('/api', router)), the '/api' portion should be removed from req.path.
// This ensures that the URL path matches the folder structure.
const express_validator_1 = require("express-validator");
const path_to_regexp_1 = require("path-to-regexp");
const api_schema_validator_1 = require("./api-schema-validator");
var validationErrorCode;
(function (validationErrorCode) {
    validationErrorCode[validationErrorCode["MANDATORY_FIELD_ERROR"] = 0] = "MANDATORY_FIELD_ERROR";
    validationErrorCode[validationErrorCode["EMPTY_FIELD_ERROR"] = 1] = "EMPTY_FIELD_ERROR";
    validationErrorCode[validationErrorCode["DATATYPE_ERROR"] = 2] = "DATATYPE_ERROR";
    validationErrorCode[validationErrorCode["PATTERN_MATCHING_ERROR"] = 3] = "PATTERN_MATCHING_ERROR";
    validationErrorCode[validationErrorCode["MIN_MAX_ERROR"] = 4] = "MIN_MAX_ERROR";
    validationErrorCode[validationErrorCode["LENGTH_ERROR"] = 5] = "LENGTH_ERROR";
    validationErrorCode[validationErrorCode["ALLOWED_VALUE_ERROR"] = 6] = "ALLOWED_VALUE_ERROR";
    validationErrorCode[validationErrorCode["ARRAY_DATATYPE_ERROR"] = 7] = "ARRAY_DATATYPE_ERROR";
})(validationErrorCode || (validationErrorCode = {}));
class RequestValidator {
    constructor(url) {
        this.customValidationHandlers = [];
        this.url = url.split('?')[0];
    }
    findRules() {
        for (const { regexp, rules } of RequestValidator.registeredRoutesRegex) {
            if (regexp.test(this.url)) {
                return rules;
            }
        }
        return '';
    }
    errorMessageConstructor(field, errorCode, extra = null) {
        let errorMsg = '';
        switch (errorCode) {
            case validationErrorCode.MANDATORY_FIELD_ERROR:
                errorMsg = `${field} : is mandatory`;
                break;
            case validationErrorCode.EMPTY_FIELD_ERROR:
                errorMsg = extra == 'array'
                    ? `${field} : should not be an empty array`
                    : `${field} : should not be empty`;
                break;
            case validationErrorCode.DATATYPE_ERROR:
                switch (extra) {
                    case 'email':
                    case 'mobile':
                        errorMsg = `Invalid ${field}`;
                        break;
                    case 'date':
                        errorMsg = `Invalid date ,${field} should be in ${RequestValidator.dateFormat} format`;
                        break;
                    default:
                        errorMsg = `${field} should be ${extra}`;
                }
                break;
            case validationErrorCode.PATTERN_MATCHING_ERROR:
                errorMsg = `${field} should be in ${extra} format`;
                break;
            case validationErrorCode.MIN_MAX_ERROR: {
                const { min, max } = extra;
                if (min && max)
                    errorMsg = `${field} should be in between ${min} and ${max}`;
                else if (min)
                    errorMsg = `${field} should be in greater than or equal to ${min}`;
                else
                    errorMsg = `${field} should be in less than or equal to ${max}`;
                break;
            }
            case validationErrorCode.LENGTH_ERROR:
                errorMsg = `length of ${field} should be ${extra}`;
                break;
            case validationErrorCode.ALLOWED_VALUE_ERROR:
                errorMsg = `Allowed values for ${field} are ${extra}`;
                break;
            case validationErrorCode.ARRAY_DATATYPE_ERROR:
                errorMsg = `${field} should be an array of ${extra}`;
                break;
            default:
                errorMsg = 'Unexpected validation error';
        }
        return { errorMsg, errorCode };
    }
    applyMandatoryFieldValidation(myBody, mandatoryRule, field) {
        if (mandatoryRule) {
            myBody.exists().withMessage(this.errorMessageConstructor(field, validationErrorCode.MANDATORY_FIELD_ERROR));
            myBody.notEmpty().withMessage(this.errorMessageConstructor(field, validationErrorCode.EMPTY_FIELD_ERROR))
                .custom((value) => {
                if (Array.isArray(value))
                    return value.length !== 0;
                return true;
            })
                .withMessage(this.errorMessageConstructor(field, validationErrorCode.EMPTY_FIELD_ERROR, 'array'));
        }
        else {
            myBody.optional();
        }
    }
    applyDataTypeValidation(myBody, dataType, field) {
        let arrayDataType = '';
        if (dataType.includes('+')) {
            [dataType, arrayDataType] = dataType.split('+');
        }
        myBody.customSanitizer((value) => {
            if (typeof value === 'string')
                return value.trim();
            return value;
        });
        const dataTypeHandlers = {
            'string': () => myBody.isString(),
            'email': () => myBody.isEmail().normalizeEmail(),
            'int': () => myBody.isInt().toInt(),
            'float': () => myBody.isFloat().toFloat(),
            'alphanumeric': () => myBody.isAlphanumeric(),
            'alpha': () => myBody.isAlpha(),
            'bool': () => myBody.isBoolean().toBoolean(),
            'mobile': () => myBody.isMobilePhone('en-IN'),
            'date': () => myBody.isDate({ format: RequestValidator.dateFormat }),
            'array': () => this.applyArrayValidation(myBody, arrayDataType, field)
        };
        if (dataTypeHandlers[dataType]) {
            dataTypeHandlers[dataType]();
        }
        if (dataType !== 'array')
            myBody.withMessage(this.errorMessageConstructor(field, validationErrorCode.DATATYPE_ERROR, dataType));
    }
    applyArrayValidation(myBody, dataType, field) {
        myBody
            .isArray()
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.DATATYPE_ERROR, 'array'));
        if (dataType !== '')
            myBody
                .custom((value) => Array.isArray(value) && value.every(val => typeof val === dataType))
                .withMessage(this.errorMessageConstructor(field, validationErrorCode.ARRAY_DATATYPE_ERROR, dataType));
    }
    applyRegexValidation(myBody, pattern, field) {
        myBody.matches(pattern)
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.PATTERN_MATCHING_ERROR, pattern));
    }
    applyMinMaxValidation(myBody, field, dataType, { min, max }) {
        const options = {};
        if (min)
            options.min = min;
        if (max)
            options.max = max;
        if (dataType == 'int')
            myBody.isInt(options);
        else
            myBody.isFloat(options);
        myBody.withMessage(this.errorMessageConstructor(field, validationErrorCode.MIN_MAX_ERROR, { min, max }));
    }
    applyLengthValidation(myBody, field, length) {
        myBody.isLength({ min: length, max: length })
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.LENGTH_ERROR, length));
    }
    applyAllowedValueValidation(myBody, field, allowedAvalues) {
        myBody
            .isIn(allowedAvalues)
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.ALLOWED_VALUE_ERROR, allowedAvalues));
    }
    expressRuleBuilder(rules, input, prefix = '') {
        return __awaiter(this, void 0, void 0, function* () {
            for (const [field, rule] of Object.entries(rules)) {
                const fullField = prefix ? `${prefix}.${field}` : field;
                if (typeof rule[Object.keys(rule)[0]] === 'object') {
                    const errorMsg = yield this.expressRuleBuilder(rule, input, fullField);
                    if (errorMsg !== '')
                        return errorMsg;
                    continue;
                }
                const myBody = (0, express_validator_1.body)(fullField);
                const dataType = rule === null || rule === void 0 ? void 0 : rule.dataType;
                this.applyMandatoryFieldValidation(myBody, rule.required, fullField);
                if (rule === null || rule === void 0 ? void 0 : rule.dataType)
                    this.applyDataTypeValidation(myBody, dataType, fullField);
                if (rule === null || rule === void 0 ? void 0 : rule.regex)
                    this.applyRegexValidation(myBody, rule.regex, fullField);
                if ((rule === null || rule === void 0 ? void 0 : rule.min) || (rule === null || rule === void 0 ? void 0 : rule.max) && ['int', 'float'].includes(dataType))
                    this.applyMinMaxValidation(myBody, fullField, dataType, { min: rule === null || rule === void 0 ? void 0 : rule.min, max: rule === null || rule === void 0 ? void 0 : rule.max });
                if ((rule === null || rule === void 0 ? void 0 : rule.length) && dataType === 'string')
                    this.applyLengthValidation(myBody, fullField, rule.length);
                if (rule === null || rule === void 0 ? void 0 : rule.allowedAvalues)
                    this.applyAllowedValueValidation(myBody, fullField, rule.allowedAvalues);
                const errorMsg = yield this.validateField(myBody, input);
                if (errorMsg !== '')
                    return errorMsg;
            }
            return '';
        });
    }
    validateField(rule, input) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield rule.run(input);
            let errorCode = Number.MAX_SAFE_INTEGER;
            let errorMsg = '';
            for (const errorField of result.array()) {
                if (errorField.msg.errorCode < errorCode) {
                    errorMsg = errorField.msg.errorMsg;
                    errorCode = errorField.msg.errorCode;
                }
            }
            return errorMsg;
        });
    }
    customValidator(input) {
        return __awaiter(this, void 0, void 0, function* () {
            let errorMsg = '';
            for (const customValidationHandler of this.customValidationHandlers) {
                errorMsg = customValidationHandler(input);
                if (errorMsg) {
                    return errorMsg;
                }
            }
            return errorMsg;
        });
    }
    validateRequest(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const rules = this.findRules();
                if (typeof rules === 'string') {
                    throw new Error(`Invalid request.Conuld not find ${this.url}`);
                }
                const input = {
                    body: Object.assign(Object.assign(Object.assign({}, req.body), req.query), req.params)
                };
                const errorMsg = (yield this.expressRuleBuilder(rules, input, '')) || (yield this.customValidator(input.body));
                if (errorMsg === '')
                    return next();
                return res.status(400).send(errorMsg);
            }
            catch (error) {
                return res.status(400).send(error.message);
            }
        });
    }
}
RequestValidator.dateFormat = 'YYYY-MM-DD';
RequestValidator.registeredRoutesRegex = [];
const loadFile = (apiSecificationFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof apiSecificationFilePath !== 'string')
        throw new Error("Invalid path");
    const reqFormat = yield require(apiSecificationFilePath);
    if (!('schema' in reqFormat))
        throw new Error(`Counld not find \'schema\' in module - ${apiSecificationFilePath}`);
    if ((0, api_schema_validator_1.validateSchema)(reqFormat.schema))
        routesToRegex(reqFormat);
    else
        throw new Error("Not a vaid schema.Follow readme.md to create schema");
});
const routesToRegex = (reqFormat) => {
    const { schema } = reqFormat;
    const routes = Object.keys(schema);
    routes.forEach((route) => {
        const routeRegex = (0, path_to_regexp_1.pathToRegexp)(route);
        RequestValidator.registeredRoutesRegex.push({ regexp: routeRegex.regexp, rules: schema[route] });
    });
};
const validateRequestHandler = (apiSecificationFilePath) => {
    loadFile(apiSecificationFilePath);
    return (req, res, next) => {
        const requestValidator = new RequestValidator(req.originalUrl);
        return requestValidator.validateRequest(req, res, next);
    };
};
exports.default = validateRequestHandler;
