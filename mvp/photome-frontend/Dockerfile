FROM node:20-alpine

WORKDIR /app

RUN npm install -g expo

COPY package.json package-lock.json* ./
RUN npm install
COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--web", "--port", "8081"]
