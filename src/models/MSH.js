export function MSH(segment){
    
    //
    if(segment.type !== "MSH"){
        throw new Error('El segmento no corresponde a este modelo.')
    }

    const fields = segment.fields;

    return {    
        clave: fields[6] ?? undefined,
    }

}