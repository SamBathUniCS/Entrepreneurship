FROM node:25-alpine

WORKDIR /app

RUN npm install -g expo @expo/ngrok

COPY package.json package-lock.json* ./

RUN npm install

RUN npm install @react-navigation/native \
    @react-navigation/native-stack

RUN npx expo install react-native-screens react-native-safe-area-context
RUN npx expo install @expo/vector-icons

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npx", "expo", "start", "--web", "--port", "8081", "--host", "lan"]
