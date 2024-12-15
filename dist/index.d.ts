declare const validateRequestHandler: (apiSecificationFilePath: string) => (req: any, res: any, next: any) => Promise<void>;
export default validateRequestHandler;
