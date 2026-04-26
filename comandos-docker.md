Os comandos básicos são esses:

1. Login


docker login
2. Build das imagens


docker build -t umasenhaai123/vestweb-frontend:latest ./client
docker build -t umasenhaai123/vestweb-backend:latest ./server
3. Push para o Docker Hub


docker push umasenhaai123/vestweb-frontend:latest
docker push umasenhaai123/vestweb-backend:latest
4. (Opcional) Tag com versão específica


docker build -t umasenhaai123/vestweb-frontend:1.0.0 ./client
docker push umasenhaai123/vestweb-frontend:1.0.0
Fluxo resumido toda vez que quiser publicar:


docker login
docker build -t umasenhaai123/vestweb-frontend:latest ./client && docker push umasenhaai123/vestweb-frontend:latest
docker build -t umasenhaai123/vestweb-backend:latest ./server && docker push umasenhaai123/vestweb-backend:latest