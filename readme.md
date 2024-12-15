# Request Validation Middleware for Node.js

This middleware simplifies API request validation in Node.js applications. Instead of writing separate validation logic for each API, you can define a schema in a single configuration file. The middleware dynamically validates all incoming requests against the schema, ensuring consistency and reducing boilerplate code.

## Features
- **Dynamic Validation**: Validate API requests using a central schema file.
- **Flexible Rules**: Supports data types, regex, nested objects, allowed values, and more.
- **Easy Integration**: Middleware integrates seamlessly with any Node.js application.
- **Centralized Schema**: Define validation rules for all APIs in a single file.

## Supported Data Types
The middleware supports validation for the following data types:
- `string`
- `email`
- `int`
- `float`
- `alphanumeric`
- `alpha`
- `bool`
- `mobile`
- `date`
- `array`

## Validation Checks
The middleware can perform the following checks:
- **Mandatory Checks**: Ensures required fields are provided.
- **Data Type Checks**: Validates fields against specified data types such as `string`, `int`, `float`, etc.
- **Regex Validation**: Applies custom regular expressions for additional checks.
- **Min and Max Value Checks**: Ensures numeric values are within the specified range (for `int` and `float`).
- **Length Checks**: Validates the maximum length of strings.
- **Allowed Values**: Ensures fields contain only specified values.
- **Array Validation**: Supports arrays of `number`, `string`, `mobile`, `bool`, and `float`.

For simple arrays of basic data types, you can use rules like:
- `dataType: "array+numbers"`
- `dataType: "array+basicdataType"`

For more complex arrays of objects, you can define rules using dot notation. For example:
```javascript
"users.*.username": { required: true, dataType: "string" },
"users.*.age": { required: true, dataType: "int", min: 18 }
```

## Future Enhancements
In upcoming versions, we plan to introduce support for custom validators. This feature will allow developers to define custom validation logic for specific APIs, providing even greater flexibility.

## Installation
```bash
npm i api-req-validator
```

## Usage

### Step 1: Define the Schema
Create a file (e.g., `validationSchema.js`) that exports the validation schema. The schema must follow the format below:

### What is a Schema?
A schema is a structured representation of the expected fields, their types, and rules for validation for each API endpoint. Each field in the schema can have properties such as:
- **`required`**: Specifies if the field is mandatory.
- **`dataType`**: Defines the type of data expected (e.g., string, int, date).
- **`regex`**: Custom regex for additional validation.
- **`length`**: Maximum length for string fields.
- **`allowedValues`**: A list of permissible values for the field.
- **`min` and `max`**: Range for numeric fields.

### Example Schema File
```javascript
const schema = {
  "/api/login": {
    username: { required: true, dataType: "string", length: 50 },
    password: { required: true, dataType: "string" },
  },
  "/api/register": {
    email: { required: true, dataType: "email" },
    age: { required: false, dataType: "int", min: 18 },
  },
};

module.exports = {
    schema
};
```

### Writing an API Schema
Each API schema is defined as a key-value pair where the key is the API route, and the value is an object containing the validation rules for the fields in the request body. Example:
```javascript
"/api/example": {
  "fieldName": {
    required: true,
    dataType: "string",
    length: 100
  },
  "nestedField": {
    key: {
      required: true,
      dataType: "int",
      min: 1
    }
  }
}
```

### Step 2: Use the Middleware
Integrate the middleware into your Node.js application.

```javascript
const express = require("express");
const {validateRequestHandler}  =  require('api-req-validator');

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

//Get absolute file path
const filePath = path.resolve(__dirname,"./apiSpecification.js");
// Apply the validation middleware and apss the file path
app.use(validateRequestHandler(filePath));
// Define your routes
app.post("/api/login", (req, res) => {
  res.send("Login successful!");
});

app.post("/api/register", (req, res) => {
  res.send("Registration successful!");
});

// Start the server
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
```

### Error Handling
The middleware handles errors as follows:

#### Application Crashes:
The application will crash in these scenarios:
1. The schema file is **not found**.
2. The schema object is **not exported** correctly (e.g., `module.exports = { schema }` is missing).
3. The schema does not **follow the required format**.

#### API-Level Errors:
The middleware will respond with an error message in these cases:
1. The **API route** is not defined in the schema file.
2. The **request body** does not comply with the validation rules (e.g., missing required fields, incorrect data types).

Error responses will be in the following format:
```json
{
  "error": true,
  "message": "<specific error message>"
}
```

### Notes:
1. Place the middleware **before all routes** to ensure requests are validated before hitting the route handlers.
2. Define the schema accurately for all APIs in your application to avoid validation errors.

## Contributing
Contributions are welcome! If you encounter any issues or have suggestions for improvement, feel free to create an issue or submit a pull request.

## License
Apache-2.0
