This was a study project, so the following `README.md`file is composed just with personal annotations on what I was doing while learning.

# Começando o Primeiro Projeto Node

## Configurações para começar o projeto

1. `yarn init -y`
2. `yarn add typescript -D`
3. `yarn tsc --init`
4. `yarn tsc`
5. `yarn add express`
6. `yarn add @types/express`
7. `yarn add ts-node-dev -D`
8. Adicionar o seguinte comando no `package.json`
~~~Json
     "scripts":{
        "dev": "ts-node-dev src/server.ts",
        "typeorm": "ts-node-dev ./node_modules/typeorm/cli.js"
     }
~~~
9. Habilitar as seguintes configurações no `tsconfig.json`
```
"strictPropertyInitialization": false,
"experimentalDecorators": true,
"emitDecoratorMetadata": true, 
```

10. `yarn add uuid`
11. `yarn add @types/uuid -D`
12. Criar uma pasta de `repositories` na _src_
13. Criar repositórios das entidades, por exemplo, `UsersRepositories.ts`

---
## A Organização do Projeto será realizada no Seguinte Modelo
```
 -> Server -> Controller -> Service -> Repository -> DB (Migration)
```
### Funções de Cada Separação

- Server -> Estabelecer a conexão da API com a plataforma
- Controller -> Será responsável pelo gerenciamento dos métodos GET, POST, PUT... (Pega as requisições [request] e encaminha para o Service [response]
- Service -> É responsável pelo tratamento de exceções, respeitar as regras de negócio.
- Repository -> É responsável pelos métodos que fazem conexão com o DB: save(), find()...
- DB -> Construído utilizando migrations, guarda as informações do projeto.
---

## Configurando Banco de Dados

1. `yarn add typeorm reflect-metadata sqlite3`
2. Criar um arquivo `ormconfig.json`
3. Configurar a `ormconfig.json`
~~~Json
{
    "type": "sqlite",
    "database": "src/database/database.sqlite",
    "migrations": ["src/database/migrations/*.ts"],
    "entities": ["src/entities/*.ts"],
    "cli": {
        "migrationsDir": "src/database/migrations",
        "entitiesDir": "src/entities"
    }
}
~~~
4. Criar uma pasta `database` em SRC e um `index.ts` dentro dela
5. Criar a connection no `index.ts`
~~~Typescript
import { createConnection } from "typeorm";

createConnection();
~~~
6. Criando uma migration
```
    yarn typeorm migration: create -n CreateUsers
```
7. Criar Tabela no migration

8. Criar uma entidade

```
    yarn typeorm entity:create -n nomeDaEntidade
```

---
## Configurando Services

1. Criar a pasta `services` na src
2. Criar as classes de service referentes às entidades
3. Exemplo de classe `service`
~~~Typescript
import { getCustomRepository } from "typeorm";
import { UsersRepositories } from "../repositories/UsersRepositories"

interface IUserRequest {
    name: string;
    email: string;
    admin?: boolean;
}

class CreateUserService {

    async execute({ name, email, admin} : IUserRequest){
        const usersRepository = getCustomRepository(UsersRepositories);

        if(!email) {
            throw new Error("Email is incorrect");
        }

        const userAlreadyExists = await usersRepository.findOne({email,});

        if(userAlreadyExists) {
            throw new Error("User already exists");
        }

        const user = usersRepository.create({
            name,
            email,
            admin
        });

        await usersRepository.save(user);

        return user;

    }
}

export { CreateUserService }
~~~

### As Classes 'service' irão executar as regras de negócio, os tratamentos de exceção

---
## Classes Controllers

1. Criar uma pasta de `controllers` na src
2. Criar as classes para as requisições necessárias
3. Exemplo de classe `controller`
~~~Typescript
import {Request, Response } from "express";
import { CreateUserService } from "../services/CreateUserService";

class CreateUserController {

    async handle(request: Request, response: Response){
        const { name, email, admin } = request.body;

        const createUserService = new CreateUserService();

        const user = await createUserService.execute({name, email, admin});

        return response.json(user);
    }
}

export { CreateUserController }
~~~

### As classes controllers serão responsáveis por encaminhar as requisições para as services
---
## Criando um arquivo de `routes.ts` para não sobrecarregar o `server.ts`

1. Criar o arquivo `routes.ts` no projeto
2. Criar as rotas
- Exemplo de rota
~~~Typescript
import { Router } from "express";
import { CreateUserController } from "./controllers/CreateUserController";


const router = Router();

const createUserController = new CreateUserController();

router.post("/users", createUserController.handle);

export { router };
~~~
3. Inserir o routes no `server.ts`
~~~Typescript
import express from 'express';
import "reflect-metadata";

import { router } from './routes';

import "./database";

const app = express();

app.use(express.json());

app.use(router);

app.listen(3000, () => console.log('Server is running'));
~~~

4. Utilizando **Middleware** para tratar erros no `server.ts`

~~~Typescript
app.use((err: Error, request: Request, response: Response, next: NextFunction) => {

    if(err instanceof Error) {
        return response.status(400).json({
            error: err.message
        });
    }

    return response.status(500).json({
        status: "error",
        message: "Internal Server Error"
    });

});
~~~

5. Adicionar a biblioteca de errors do Express
- `yarn add express-async-errors`
- Importá-la no `server.ts`
    - ~~~Typescript
        import "express-async-errors";
      ~~~
---
## Middleware

1. Criar pasta de `middlewares.ts`
2. Exemplo de middleware
    - Garantir que o usuário fazendo tal ação é um admin
        - File `ensureAdmin.ts`
          ~~~Typescript
            import { Request, Response, NextFunction } from "express";
            import { getCustomRepository } from "typeorm";
            import { UsersRepositories } from "../repositories/UsersRepositories";

            export async function ensureAdmin(
            request: Request,
            response: Response,
            next: NextFunction
            ) {
            // Verify if user is admin

            const { user_id } = request;

            const usersRepositories = getCustomRepository(UsersRepositories);

            const { admin } = await usersRepositories.findOne(user_id);

            if (admin) {
                return next();
            }

            return response.status(401).json({
                error: "Unauthorized",
            });
            }

          ~~~
3. Colocando o middleware no `routes.ts`
    - ~~~Typescript
        import { ensureAdmin } from "./middlewares/ensureAdmin";
        
        router.post("/tags", ensureAdmin, createTagController.handle);
      ~~~
---

## JWT (Json Web Token)

1. `yarn add jsonwebtoken`
2. `yarn add @types/jsonwebtoken -D`
3. Criar um service de autenticação
4. Fazer as verificações dentro do service, nesse caso, `AuthenticateUserService.ts`
    ~~~Typescript
    import { getCustomRepository } from "typeorm";
    import { UsersRepositories } from "../repositories/UsersRepositories";
    import { compare } from "bcryptjs";
    import { sign } from "jsonwebtoken"



    interface IAuthenticateRequest {
        email: string;
        password: string;
    }

    class AuthenticateUserService {

        async execute({email, password}: IAuthenticateRequest) {
            const usersRepositories = getCustomRepository(UsersRepositories);

            // Verificar se email existe
            const user = await usersRepositories.findOne({email
            });

            if(!user) {
                throw new Error("Email/Password incorrect");
            }

            // Verificar se senha está correta
            const passwordMatch = await compare(password, user.password)

            if(!passwordMatch) {
                throw new Error("Email/Password incorrect");
            }

            // Gerar Token
            const secretHash = "318d40e43c5f8c0f5bc39cda8bcf3b3e"
            const token = sign({
                email: user.email
            }, secretHash, {
            subject: user.id,
            expiresIn: "1d"
        });

        return token;
        }
    }
    ~~~
5. Criar a classe no controller - `AuthenticateUserController.ts`
    ~~~Typescript
    import { Request, Response} from "express";
    import { AuthenticateUserService } from "../services/AuthenticateUserService";


    class AuthenticateUserController {

        async handle(request: Request, response: Response) {
            const { email, password } = request.body;

            const authenticateUserService = new AuthenticateUserService();

            const token = await authenticateUserService.execute({
                email,
                password
            });

            return response.json(token)
        }
    }

    export { AuthenticateUserController }
    ~~~
6. Adicionar no `routes.ts`
    ~~~Typescript
        const authenticateUserController = new AuthenticateUserController();
        router.post("/login", authenticateUserController.handle);
    ~~~
7. Criar um middleware, `ensureAuthenticated.ts`
    ~~~Typescript
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
    ~~~
8. Criar uma pasta de `@types` na src
    - __Não esquecer de habilitar a pasta @types no `tsconfig.json`__
        *"typeRoots": ["./src/@types"],*
    - Dentro da pasta, criar outra folder `express`
    - dentro de `express`, criar um arquivo `index.d.ts`
        ~~~Typescript
        declare namespace Express {
            export interface Request {
                user_id: string;
            }
        }
        ~~~


---
## Criptografando a Password (BCryptJS)

1. `yarn add bcryptjs`
2. `yarn add @types/bcryptjs -D`
3. Criptografar a senha no Service
    ~~~Typescript
    import { hash } from "bcryptjs";

        const passwordHash = await hash(password, 8);

        const user = usersRepository.create({
            name,
            email,
            admin,
            password: passwordHash
        });
    ~~~
---

## Como rodar o Programa

* *Depois de Configurado:*  
```
yarn dev
```

---

## Dicas

### Exemplo de `server.ts` inicial

~~~Typescript
import express from 'express';
import "reflect-metadata";

import "./database";

const app = express();

app.listen(3000, () => console.log('Server is running'));
~~~

### Exemplos de GET e POST

~~~Javascript
app.get("/test", (request, response) => {
    return response.send("Resposta do GET")
});

app.post("/test-post", (request, response) => {
    return response.send("Resposta do POST")
})
~~~

### Exemplo de Criação de Tabela em Migrations

* Não esquecer de importar o Table no import: `import{MigrationInterface, QueryRunner, Table}`

~~~Typescript
public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "users",
                columns:[
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true
                    },
                    {
                        name: "name",
                        type: "varchar"
                    },
                    {
                        name: "email",
                        type: "varchar"
                    }
                ]
            })
        )
    }
~~~

### Adicionando uma nova coluna na tabela (Password)

1. `yarn typeorm migration:create -n AlterUserAddPassword`
2. Criar a coluna
    ~~~Typescript
    import {MigrationInterface, QueryRunner, TableColumn} from "typeorm";

    export class AlterUserAddPassword1626694419202 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "users",
            new TableColumn({
                name: "password",
                type: "varchar",
                isNullable: true
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "password");
    }

}
    ~~~
3. `yarn typeorm migration:run`
4. Alterar todas as classes do usuário, adicionando o parâmetro novo.
### Exemplo de deleção de Tabela

~~~Typescript
public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("users");
    }
~~~

### Criando Tabelas com ForeignKey

~~~Typescript
import {MigrationInterface, QueryRunner, Table} from "typeorm";

export class CreateCompliments1626697650378 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "compliments",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true
                    },
                    {
                        name: "user_sender",
                        type: "uuid",
                    },
                    {
                        name: "user_receiver",
                        type: "uuid",
                    },
                    {
                        name: "tag_id",
                        type: "uuid",
                    },
                    {
                        name: "message",
                        type: "varchar"
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ],
                foreignKeys: [
                    {
                        name: "FKUserSenderCompliments",
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        columnNames: ["user_sender"],
                        onDelete: "SET NULL",
                        onUpdate: "SET NULL"
                    },
                    {
                        name: "FKUserReceiverCompliments",
                        referencedTableName: "users",
                        referencedColumnNames: ["id"],
                        columnNames: ["user_receiver"],
                        onDelete: "SET NULL",
                        onUpdate: "SET NULL"
                    },
                    {
                        name: "FKTagCompliments",
                        referencedTableName: "tags",
                        referencedColumnNames: ["id"],
                        columnNames: ["tag_id"],
                        onDelete: "SET NULL",
                        onUpdate: "SET NULL"
                    }
                ]
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("compliments");
    }

}

~~~

### Criando Entidades que tem JoinColumn

~~~Typescript
        import { Entity, PrimaryColumn, Column, CreateDateColumn, JoinColumn, ManyToOne } from "typeorm";
        import { v4 as uuid } from "uuid";
        import { Tag } from "./Tag";
        import { User } from "./User";

        @Entity("compliments")
        class Compliment {

            @PrimaryColumn()
            readonly id: string;

            @Column()
            user_sender: string;

            @JoinColumn({name: "user_sender"})
            @ManyToOne(() => User)
            userSender: User

            @Column()
            user_receiver: string;

            @JoinColumn({name: "user_receiver"})
            @ManyToOne(() => User)
            userReceiver: User

            @Column()
            tag_id: string;

            @JoinColumn({name: "tag_id"})
            @ManyToOne(() => Tag)
            tag: Tag;

            @Column()
            message: string;

            @CreateDateColumn()
            created_at: Date;

            constructor() {
                if(!this.id){
                    this.id = uuid();
                }
            }

        }

        export { Compliment }
~~~

### Como rodar uma migration

```
yarn typeorm migration:run
```

### Como reverter a última migration

```
yarn typeorm migration:revert
```

## Exemplo de Classe User

~~~Typescript
import {Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn} from "typeorm";
import { v4 as uuid } from "uuid";
@Entity("users")
class User {

    @PrimaryColumn()
    readonly id: string;

    @Column()
    name: string;

    @Column()
    email: string;

    @Column()
    admin: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    constructor() {
        if(!this.id) {
            this.id = uuid();
        }
    }
}

export { User };

~~~

## Exemplo de Repositories

~~~Typescript
import { EntityRepository, Repository } from "typeorm";
import { User } from "../entities/User";

@EntityRepository(User)
class UsersRepositories extends Repository<User>{

}

export { UsersRepositories }
~~~

### Colocar um default

~~~Typescript
async execute({ name, email, admin = false, password} : IUserRequest) {...}
~~~

### Create compliment controller refatorado

~~~Typescript
import { Request, Response } from "express"
import { CreateComplimentService } from "../services/CreateComplimentService"


class CreateComplimentController {

    async handle(request: Request, response: Response){
        const {tag_id, user_receiver, message} = request.body;
        const { user_id } = request;

        const createComplimentService = new CreateComplimentService();

        const compliment = await createComplimentService.execute({
            tag_id,
            user_sender: user_id, 
            user_receiver, 
            message
        })

        return response.json(compliment);

    }

}

export { CreateComplimentController }
~~~

### Retornando uma Lista do BD

1. Classe no Service
    ~~~Typescript
    import { getCustomRepository } from "typeorm"
    import { ComplimentsRepositories } from "../repositories/ComplimentsRepositories";




    class ListUserReceiveComplimentsService {

        async execute(user_id: string) {
            const complimentsRepositories = getCustomRepository(ComplimentsRepositories);

            const compliments = await complimentsRepositories.find({
                where: {
                    user_receiver: user_id
                },
            relations: ["userSender", "userReceiver", "tag" ]
            });

            return compliments;
        }
    }

    export { ListUserReceiveComplimentsService }
    ~~~
2. Classe no Controller
    ~~~Typescript
    import { Request, Response } from "express"
    import { ListUserReceiveComplimentsService } from "../services/ListUserReceiveComplimentsService"


    class ListUserReceiveComplimentsController {

        async handle(request: Request, response: Response){
            const { user_id } = request;

            const listUserReceiveComplimentsService = new ListUserReceiveComplimentsService();

            const compliments = await listUserReceiveComplimentsService.execute(user_id);

            return response.json(compliments);
        }
    }

    export { ListUserReceiveComplimentsController }
    ~~~

    ### Utilizando class transformer para omitir senha no get listUsers

    1. `yarn add class-transformer`
    2. Colocar na entidade
        ~~~Typescript
        import { Exclude } from "class-transformer";

        @Exclude()
        @Column()
        password: string;
        ~~~
    3. Colocar no service
    ~~~Typescript
        import { getCustomRepository } from "typeorm"
        import { UsersRepositories } from "../repositories/UsersRepositories"
        import { classToPlain } from "class-transformer";


        class ListUsersService {

            async execute(){
                const usersRepositories = getCustomRepository(UsersRepositories);

                const users = await usersRepositories.find();

                return classToPlain(users);

            }
        }

        export {ListUsersService}
    ~~~
---

### Ligar com o Front-End

1. `yarn add cors`
2. `yarn add @types/cors -D`
3. Importar cors no `server.ts` e dar um `app.use(cors())`
