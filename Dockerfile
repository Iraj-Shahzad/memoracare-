# MemoryCare frontend (Next.js)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Copy face-recognition model weights into public/models.
RUN cp -r node_modules/@vladmandic/face-api/model/* public/models/ 2>/dev/null || true

# NEXT_PUBLIC_* vars are baked at build time; override via --build-arg.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
