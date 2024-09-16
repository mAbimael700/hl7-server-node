import express from "express";
import http from "node:http";
import logger from "morgan";
import fs from "node:fs";
import path from "node:path";
import { Server } from "socket.io";
import { format } from "date-fns";
import cors from "cors";

import { hl7Parser } from "./lib/hl7Parser.js";

// Configurar el host y el puerto a través de variables de entorno
let HOST = process.env.HOST || "localhost";
let PORT = process.env.PORT || 3000;
let savePath = "./data/";

const app = express();
//Middlewares en express
app.use(logger("dev"));
app.use(express.json());
app.use(express.static("client"));

// Configura una ruta de Express para mostrar el cliente
/* app.get("/", (req, res) => {
}); */

let server; // Guarda la referencia al servidor para reiniciarlo
let io; // Guarda la referencia de socket.io

// Función para actualizar la ruta de guardado desde un evento de Socket.IO
function updateSavePath(clientPath) {
  // Ruta base absoluta para la carpeta 'data'
  const basePath = path.resolve(process.cwd(), "./data/");
  // Limpia y valida la ruta proporcionada por el cliente
  let cleanPath = clientPath;

  // Elimina cualquier prefijo './data/' si existe
  if (cleanPath.startsWith("./data/")) {
    cleanPath = cleanPath.substring("./data/".length);
  } else if (cleanPath.startsWith("./")) {
    cleanPath = cleanPath.substring(2);
  }

  // Resuelve la ruta completa a partir de la base ('./data') y la ruta del cliente
  const fullPath = path.resolve(basePath, cleanPath);

  // Verifica que la ruta proporcionada esté dentro de './data'
  if (!fullPath.startsWith(basePath)) {
    throw new Error("La ruta especificada está fuera de la carpeta permitida");
  }

  // Crea el directorio si no existe
  fs.mkdirSync(fullPath, { recursive: true });

  // Devuelve la ruta relativa desde la carpeta base, con diagonales normales
  const relativePath = path.relative(basePath, fullPath).replace(/\\/g, "/");

  return "data/" + relativePath; // Devolver la ruta relativa con diagonales normales
}

const initializeServer = () => {
  // Crea el servidor HTTP a partir de express
  server = http.createServer(app);

  // Se inicializa Socket.IO en el servidor HTTP
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ['GET', 'POST']
    },
  });

  // Configurar eventos de Socket.IO
  io.on("connection", (socket) => {
    console.log("Nuevo cliente conectado");

    // Envia un mensaje al cliente conectado
    socket.emit("message", {
      data: "Bienvenido al servidor WebSocket",
      HOST,
      PORT,
      savePath: savePath === "./data/" ? "" : savePath,
    });

    socket.on("hl7 message", (message) => {
      
      
      const filePath = `${savePath}/hl7-message-${format(
        new Date(),
        "ddMMyyyy-HHmmss"
      )}.txt`;

      const parsedMessage = hl7Parser(message);

      fs.writeFile(filePath, JSON.stringify(parsedMessage), (err) => {
        if (err) {
          console.error("Error al guardar el mensaje HL7", err);
          return;
        }
        console.log("Mensaje HL7 guardado en:", filePath);
        
        socket.emit("hl7 message", {
          filePath,
          message: `HL7 message saved in ${filePath}`,
          data: hl7Parser(message),
        });
        //io.emit("hl7 message", hl7Parser(msg));
      });
    });

    // Escucha configuración de host, puerto y savePath
    socket.on("config", (config) => {
      const { newHost, newPort, newSavePath } = config;

      if (newHost) HOST = newHost;
      if (newPort) PORT = newPort;
      //if (newSavePath) savePath = newSavePath;

      /* if (newSavePath) {
        try {
          // Valida y crea carpetas que aún no existan en la ruta especificada
          savePath = ensureValidSavePath(newSavePath);
          console.log(`Ruta de guardado actualizada: ${savePath}`);
        } catch (error) {
          console.error(`Error: ${error.message}`);
          socket.emit("error", { message: error.message });
          return; // Se detiene si la ruta no es válida
        }
      } */

      // Emite la confirmación a los clientes conectados
      io.emit("configUpdated", {
        HOST,
        PORT,
        savePath,
      });

      // Reinicia el servidor si se cambia el host o el puerto
      if (newHost || newPort) {
        io.emit("serverRestarting", {
          message: "El servidor se reiniciará con los nuevos valores",
          HOST,
          PORT,
          savePath,
        });

        setTimeout(() => {
          console.log("Cerrando servidor...");

          // Cierra conexiones de Socket.IO antes de cerrar el servidor
          io.close(() => {
            console.log("Conexiones de Socket.IO cerradas.");

            server.close(() => {
              console.log(
                `Servidor detenido. Reiniciando en Host=${HOST}, Puerto=${PORT}`
              );
              initializeServer(); // Vuelve a iniciar el servidor con la nueva configuración
            });
          });
        }, 1000);
      }
    });

    socket.on("setPath", (data) => {
      const { newSavePath } = data;
      try {
        savePath = updateSavePath(newSavePath);
      } catch (error) {
        console.error(error.message);
        socket.emit("error", { error });
      }
    });

    socket.on("stopServer", () => {
      setTimeout(() => {
        console.log("Cerrando servidor...");

        // Cierra las conexiones de Socket.IO antes de cerrar el servidor
        io.close(() => {
          console.log("Conexiones de Socket.IO cerradas.");

          server.close(() => {
            console.log(`Servidor detenido.`);
          });
        });
      }, 1000);
    });

    // Maneja la desconexión del cliente
    socket.on("disconnect", () => {
      console.log("Cliente desconectado");
    });
  });

  // Inicia el servidor en el host y puerto configurado
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://${HOST}:${PORT}`);
  });
};

// Iniciar el servidor por primera vez
initializeServer();
