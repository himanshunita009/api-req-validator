// This middleware is designed to validate incoming requests based on predefined rules.
// It follows a specific folder structure and file naming convention.

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

import { body, ValidationChain } from 'express-validator';
import { pathToRegexp } from 'path-to-regexp';
import { validateSchema } from './api-schema-validator';

enum validationErrorCode {
    MANDATORY_FIELD_ERROR,
    EMPTY_FIELD_ERROR,
    DATATYPE_ERROR,
    PATTERN_MATCHING_ERROR,
    MIN_MAX_ERROR,
    LENGTH_ERROR,
    ALLOWED_VALUE_ERROR,
    ARRAY_DATATYPE_ERROR
}

type ValidatorFunction = (body: object) => string ;

class RequestValidator {
    private url: string;
    private static dateFormat = 'YYYY-MM-DD';
    public static readonly registeredRoutesRegex = [];
    private customValidationHandlers : ValidatorFunction[]  = [];
    constructor(url: string) {
        this.url = url.split('?')[0];
    }
    private findRules() {
        for(const {regexp,rules} of RequestValidator.registeredRoutesRegex ){
            if(regexp.test(this.url)){
                return rules;
            }
        }
        return '';
    }
    private errorMessageConstructor(field: string, errorCode: number, extra = null) {
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
                const{ min, max } = extra;
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
    private applyMandatoryFieldValidation(myBody: ValidationChain, mandatoryRule: string, field: string) {
        if (mandatoryRule) {
            myBody.exists().withMessage(this.errorMessageConstructor(field, validationErrorCode.MANDATORY_FIELD_ERROR))
            myBody.notEmpty().withMessage(this.errorMessageConstructor(field, validationErrorCode.EMPTY_FIELD_ERROR))
            .custom((value) => {
                if(Array.isArray(value)) 
                    return value.length !== 0;
                return true;
            })
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.EMPTY_FIELD_ERROR,'array'));
        } else {
            myBody.optional();
        }
    }
    private applyDataTypeValidation(myBody: ValidationChain, dataType: string, field: string) {
        let arrayDataType = '';
        if(dataType.includes('+')){
            [dataType,arrayDataType] = dataType.split('+'); 
        } 
        myBody.customSanitizer((value) => {
            if(typeof value === 'string')
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
            'date': () => myBody.isDate({format: RequestValidator.dateFormat}),
            'array': () => this.applyArrayValidation(myBody,arrayDataType,field)
        };
        if (dataTypeHandlers[dataType]) {
            dataTypeHandlers[dataType]();
        }
        if(dataType !== 'array')
            myBody.withMessage(this.errorMessageConstructor(field, validationErrorCode.DATATYPE_ERROR, dataType));
    }
    private applyArrayValidation(myBody: ValidationChain,dataType: string,field: string){
        myBody
            .isArray()
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.DATATYPE_ERROR, 'array'));
        if(dataType !== '')
            myBody
            .custom((value) => Array.isArray(value) && value.every(val => typeof val === dataType))
            .withMessage(this.errorMessageConstructor(field, validationErrorCode.ARRAY_DATATYPE_ERROR, dataType));
    }    
    private applyRegexValidation(myBody: ValidationChain, pattern: string , field: string) {
            myBody.matches(pattern)
                  .withMessage(this.errorMessageConstructor(field, validationErrorCode.PATTERN_MATCHING_ERROR, pattern));
    }
    private applyMinMaxValidation(myBody: ValidationChain,field: string,dataType: string,{min,max}){
        const options: { min?: number, max?: number } = {};
        if(min)
            options.min = min;
        if(max)
            options.max = max;
        if(dataType == 'int')
            myBody.isInt(options)
        else 
            myBody.isFloat(options);
        myBody.withMessage(this.errorMessageConstructor(field,validationErrorCode.MIN_MAX_ERROR,{min,max}))
    }
    private applyLengthValidation(myBody: ValidationChain,field: string,length: number){
        myBody.isLength({min: length,max: length})
        .withMessage(this.errorMessageConstructor(field,validationErrorCode.LENGTH_ERROR,length));
    }
    private applyAllowedValueValidation(myBody: ValidationChain,field: string,allowedAvalues){
        myBody
            .isIn(allowedAvalues)
            .withMessage(this.errorMessageConstructor(field,validationErrorCode.ALLOWED_VALUE_ERROR,allowedAvalues));
    }
    private async expressRuleBuilder(rules: object,input: object, prefix = '') {
        for (const [field, rule] of Object.entries(rules)) {
            const fullField = prefix ? `${prefix}.${field}` : field;
            if (typeof rule[Object.keys(rule)[0]] === 'object') {
                const errorMsg = await this.expressRuleBuilder(rule,input, fullField );
                if(errorMsg !== '') return errorMsg;
                continue;
            }
            const myBody = body(fullField);
            const dataType = rule?.dataType;
            this.applyMandatoryFieldValidation(myBody, rule.required, fullField);
            if(rule?.dataType)
                this.applyDataTypeValidation(myBody, dataType, fullField);
            if (rule?.regex) 
                this.applyRegexValidation(myBody, rule.regex, fullField);
            if (rule?.min || rule?.max && ['int', 'float'].includes(dataType))
                this.applyMinMaxValidation(myBody, fullField, dataType, {min : rule?.min ,max: rule?.max});
            if (rule?.length && dataType === 'string')
                this.applyLengthValidation(myBody, fullField, rule.length);
            if (rule?.allowedAvalues)
                this.applyAllowedValueValidation(myBody, fullField, rule.allowedAvalues);
            const errorMsg = await this.validateField(myBody, input);
            if (errorMsg !== '') return errorMsg;
        }
        return '';
    }
    private async validateField(rule: ValidationChain,input){
        const result = await rule.run(input);
        let errorCode = Number.MAX_SAFE_INTEGER;
        let errorMsg = '';
        for (const errorField of result.array()) {
            if(errorField.msg.errorCode < errorCode){
                errorMsg = errorField.msg.errorMsg;
                errorCode = errorField.msg.errorCode;
                
            }
        }
        return errorMsg;   
    }
    private async customValidator(input: object): Promise<string> {
        let errorMsg = '';
        
        for (const customValidationHandler of this.customValidationHandlers) {
            errorMsg = customValidationHandler(input);
            if (errorMsg) {
                return errorMsg;
            }
        }
        return errorMsg;
    }
    public async validateRequest(req, res, next): Promise<void> {
        try {
            const rules = this.findRules();
            if(typeof rules === 'string'){
                throw new Error(`Invalid request.Conuld not find ${this.url}`);
            }
            const input = {
                body: { ...req.body, ...req.query, ...req.params }
            };
            const errorMsg = await this.expressRuleBuilder(rules,input, '') || await this.customValidator(input.body);
            if(errorMsg === '')
                return next();
            return res.status(400).send(errorMsg);
        } catch (error) {
            return res.status(400).send(error.message);
        }
    }
}
const loadFile = async (apiSecificationFilePath: string) => {
    if(typeof apiSecificationFilePath !== 'string')
        throw new Error("Invalid path");
    const reqFormat = await require(apiSecificationFilePath);
    if(!('schema' in reqFormat))
        throw new Error(`Counld not find \'schema\' in module - ${apiSecificationFilePath}`);
    if(validateSchema(reqFormat.schema))
        routesToRegex(reqFormat)
    else 
        throw new Error("Not a vaid schema.Follow readme.md to create schema");
}
const routesToRegex = (reqFormat) => {
    const {schema} = reqFormat;
    const routes = Object.keys(schema);
    routes.forEach((route) => {
        const routeRegex = pathToRegexp(route);
        RequestValidator.registeredRoutesRegex.push({regexp: routeRegex.regexp,rules: schema[route]});
    });
}

const validateRequestHandler = (apiSecificationFilePath: string) => {
    loadFile(apiSecificationFilePath);
    return (req, res, next): Promise<void> => {
        const requestValidator = new RequestValidator(req.originalUrl);
        return requestValidator.validateRequest(req, res, next);
    };
} 
export default validateRequestHandler;

