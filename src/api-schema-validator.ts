

class ApiSchemaValidator {
    private errors: string[] = [];
    private static  validDataTypes = [
        "int", "string", "array+number", "array+string", 
        "array+mobile", "array+bool", "array+float", 
        "date", "mobile", "bool", "alpha", 
        "alphanumeric", "float", "email"
    ];
    private static validProperties = ['required', 'dataType', 'regex', 'min', 'max', 'length', 'allowedValues'];

    private validateValidationRule(rule: object, path: string) {
        // Check if the rule is an object
        if (typeof rule !== 'object' || rule === null) {
            this.errors.push(`${path}: Must be an object`);
            return;
        }

        // Check for unknown properties
        
        Object.keys(rule).forEach(key => {
            if (!ApiSchemaValidator.validProperties.includes(key)) {
                this.errors.push(`${path}: Unknown property '${key}'`);
            }
        });

        // Validate required property
        if ('required' in rule && typeof rule.required !== 'boolean') {
            this.errors.push(`${path}: 'required' must be a boolean`);
        }

        // Validate dataType
        if ('dataType' in rule && typeof rule.dataType === 'string' && !ApiSchemaValidator.validDataTypes.includes(rule.dataType)) {
            this.errors.push(`${path}: Invalid dataType '${rule.dataType}'`);
        }

        // Validate regex
        if ('regex' in rule && typeof rule.regex !== 'string') {
            this.errors.push(`${path}: 'regex' must be a string`);
        }

        // Validate min/max/length
        if ('min' in rule && typeof rule.min !== 'number') {
            this.errors.push(`${path}: 'min' must be a number`);
        }
        if ('max' in rule && typeof rule.max !== 'number') {
            this.errors.push(`${path}: 'max' must be a number`);
        }
        if ('length' in rule && typeof rule.length !== 'number') {
            this.errors.push(`${path}: 'length' must be a number`);
        }

        // Validate allowedValues
        if ('allowedValues' in rule) {
            if (!Array.isArray(rule.allowedValues)) {
                this.errors.push(`${path}: 'allowedValues' must be an array`);
            }
        }
    }

    private isValidationRule(obj: object): boolean {
        return obj && typeof obj === 'object' && (
            'dataType' in obj || 
            'required' in obj || 
            'regex' in obj || 
            'min' in obj || 
            'max' in obj || 
            'length' in obj || 
            'allowedValues' in obj
        );
    }

    private validateNestedStructure(obj: object, path: string) {
        if (typeof obj !== 'object' || obj === null) {
            this.errors.push(`${path}: Must be an object`);
            return;
        }

        Object.entries(obj).forEach(([key, value]) => {
            const newPath = path ? `${path}.${key}` : key;

            if (this.isValidationRule(value)) {
                this.validateValidationRule(value, newPath);
            } else if (typeof value === 'object' && value !== null) {
                this.validateNestedStructure(value, newPath);
            } else {
                this.errors.push(`${newPath}: Invalid schema structure`);
            }
        });
    }

    public schemaValidator(schema ){
        if (typeof schema !== 'object' || schema === null) {
            this.errors.push('Schema must be an object');
            return { isValid: false, error : this.errors };
        }
    
        // Validate each route
        Object.entries(schema).forEach(([route, routeSchema]) => {
            if (typeof route !== 'string') {
                this.errors.push('Route must be a string');
                return { isValid: false, error : this.errors };
            }
    
            if (typeof routeSchema !== 'object' || routeSchema === null) {
                this.errors.push(`Route '${route}': Must contain an object of validation rules`);
                return { isValid: false, error : this.errors };
            }
    
            this.validateNestedStructure(routeSchema, route);
        });
    
        return { isValid: this.errors.length === 0,error : this.errors };
    }
}


const validateSchema = (apiSchema) => {
    const validator =  new ApiSchemaValidator();
    const result = validator.schemaValidator(apiSchema);
    if(result.isValid)
        return true;
    else
        return false;
}

export {validateSchema}