# Usuários ( users/auth )
Rotas, requests e responses das rotas de usuários.

## Rotas

```
POST: Login, Create
GET: ME, List
```

- **Login**: Retorna JWT (token) para authenticação. [auth/login](http://localhost:3333/auth/login).
- **Create**: Cria usuário ([admin], [staff] ou [resident]). [/users](http://localhost:3333/users)
- **Me**: Retorna dados do usuário específico conforme [ID]. [/users](http://localhost:3333/users)
- **List**: Retorna lista de todos os usuários. [/users](http://localhost:3333/users)

### Login

#### Request

```
email: string *required*
password: string *required*
```

#### Response

```
token: jwt
user: {
  id: uuid
  name: string
  email: string
  role: enum[admin, staff, resident]
}
```

### Create

#### Request

```
name: string *required*
email: string *required*
password: string **required
role: enum[admin, staff, resident]
phone: string *optional*
apartment: string *optional*
building: string *optional*
vehicle: string *optional*
emergencyContact: string *optional*
```

#### Response

```
name: string
email: string
role: [admin, staff, resident]
phone: string | null
password: hash
residents: {
  building: string | null
  vehicle: string | null
  emergencyContact: string | null
}
```


### Me

#### Request

```
no request body.
```

#### Response

```
id: string
name: string
email: string
phone: string | null
password: hash
role: [admin, staff, resident]
apartment: string | null
createdAt: datetime,
updatedAt: datetime,
```

### List

#### Request

```
no request body.
```

#### Response

```
email: string
password: string
id: string
name: string
phone: string | null
role: [admin, staff, residentes]
apartment: string | null
createdAt: datetime
updatedAt: datetime
residents: {
  id: string
  building: string | null
  vehicle: string | null
  emergencyContact: string | null
  userId: string
} | null
```

# Visitantes ( visitors )
Rotas, requests e responses das rotas de visitantes.

## Rotas
```
POST: Register, Entry, Exit
GET: List
```

- **Register**: Cria visitante. [auth/login](http://localhost:3333/visitors).
- **Entry**: Registra entrada do visitante. [/users](http://localhost:3333/visitors/1/entry)
- **Exit**: Registra saída do visitante. [/users](http://localhost:3333/visitors/1/exit)
- **List**: Retorna lista de todos os visitante. [/users](http://localhost:3333/visitors)

### Register

#### Request

```
name: string *required*
document: string *required*
phone: string *optional*
visitReason: string *optional*
hostId: uuid *required*
```

#### Response

```
visitor: {
  id: string
  name: string
  phone: string | null
  createdAt: Date
  updatedAt: Date
  document: string
  visitReason: string | null
  status: [pending, authorized, denied]
}
host: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: datetime
  updatedAt: datetime
}
handledBy: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: Date
  updatedAt: Date
} | null
```

### Entry
Alterna status para **authorized** e marca data de entrada.

#### Request

```
notes: string *optional*
```

#### Response
```
visitor: {
  id: string
  name: string
  phone: string | null
  createdAt: Date
  updatedAt: Date
  document: string
  visitReason: string | null
  status: [pending, authorized, denied]
}
host: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: datetime
  updatedAt: datetime
}
handledBy: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: Date
  updatedAt: Date
} | null
```

### Exit
Marca data de saída.

#### Request

```
notes: string *optional*
```

#### Response
```
visitor: {
  id: string
  name: string
  phone: string | null
  createdAt: Date
  updatedAt: Date
  document: string
  visitReason: string | null
  status: [pending, authorized, denied]
}
host: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: datetime
  updatedAt: datetime
}
handledBy: {
  email: string
  password: string
  id: string
  name: string
  phone: string | null
  role: [admin, staff, resident]
  apartment: string | null
  createdAt: Date
  updatedAt: Date
} | null
```

### List

#### Request

```
no request body.
```

#### Response

```
visitor: {
  id: string
  name: string
  phone: string | null
  createdAt: datetime
  updatedAt: datetime
  document: string
  visitReason: string | null
  status: enum[pending, authorized, denied]
}
host: {
  name: string
  apartment: string | null
}
handledBy: { 
  name: string
  id: string
  hostId: string
  entryTime: Date | null
  exitTime: Date | null
  notes: string | null
  visitorId: string
  handledById: string | null
} | null
```

