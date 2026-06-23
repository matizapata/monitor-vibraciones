{
  "name": "tei201-vibracion-backend",
  "version": "1.0.0",
  "description": "API + dashboard para monitoreo de vibraciones IoT (ESP32 + MPU6050). TEI201 - UAI.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "init-db": "node db/init.js",
    "simulate": "node simulate.js"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.11.5"
  },
  "license": "MIT"
}
