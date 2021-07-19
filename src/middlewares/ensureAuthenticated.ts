import { Request, Response, NextFunction} from "express";
import { verify } from "jsonwebtoken";

interface IPayLoad {
    sub: string;
}

export function ensureAuthenticated( request: Request, response: Response, next: NextFunction) {

    // Receber o Token
    const authToken = request.headers.authorization

    // Validar se Token está preenchido
    if(!authToken) {
        return response.status(401).end();
    }
    
    const [,token] = authToken.split(" ")
    
    // Validar o token
    try{
        const { sub } = verify(token, "318d40e43c5f8c0f5bc39cda8bcf3b3e") as IPayLoad;
        
        // Recuperar informações do usuário
        request.user_id = sub;

        return next();

    } catch(err) {
        return response.status(401).end();
    }
    
}