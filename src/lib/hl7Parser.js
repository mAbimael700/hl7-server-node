import { hl7MessageEx } from "../constants/hl7message.js";
import { MSH } from "../models/MSH.js";
import { OBR } from "../models/OBR.js";
import { OBX } from "../models/OBX.js";
import {
  getFieldSeparator,
  getFieldsSegment,
  getSegments,
} from "./hl7MessageSpliter.js";

/* Soy un comentario */
export function hl7Parser(hl7Message) {
  //Divide el mensaje en sus segmentos
  const segments = getSegments(hl7Message);
  const separator = getFieldSeparator(hl7Message);

  //Creamos un objeto para retornarlo como resultado
  let result = {};

  /* El arreglo de segmentos se recorre por cada uno de ellos, 
  dependiento del tipo de mensaje se agrega a un atributo distinto del objeto resultado */

  segments.forEach((segment) => {

    //Devuelve un objeto con su tipo de mensaje y una lista de los datos por cada renglon (segmento)
    const fieldsSegment = getFieldsSegment(separator, segment);

    switch (fieldsSegment.type) {
      //Por cada tipo de segmento, se llama una función parecida a un constructor de su modelo de tipo de mensaje HL7
      case "OBR": {
        result["OBR"] = {
          message_type: fieldsSegment.type,
          segment_name: "Order observation Request Information",
          ...OBR(fieldsSegment),
        };
        break;
      }

      case "OBX": {
        if (!result["OBX_values"]) {
          result["OBX_values"] = {
            message_type: fieldsSegment.type,
            segment_name: "OBX values",
            results: [],
          };
        }
        result["OBX_values"].results.push(OBX(fieldsSegment));
        break;
      }

      case "MSH": {
        result["MSH"] = {
          message_type: "MSH",
          segment_name: "Message Header",
          ...MSH(fieldsSegment),
        };
        break;
      }

      default: {
        console.warn(`Message type '${fieldsSegment.type}' is not recognized`);
      }
    }
  });

  //Devuelve el objeto con el mensaje HL7 parseado
  return result;
}
