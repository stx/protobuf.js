"use strict";
module.exports = decoder;

var Enum    = require("./enum"),
    types   = require("./types"),
    util    = require("./util");

function missing(field) {
    return "missing required '" + field.name + "'";
}

function getFieldType(field) {

  switch (field.type) {
    case "double":
      return 1;
    case "float":
      return 5;
    case "int32":
    case "uint32":
    case "sint32":
      return 0;
    case "fixed32":
    case "sfixed32":
      return 5;
    case "int64":
    case "uint64":
    case "sint64":
      return 0;
    case "fixed64":
    case "sfixed64":
      return 1;
    case "bool":
      return 0;
  }

  if (field.resolvedType instanceof Enum) {
    return 0;
  }

  if (field.message) {
    return 2;
  }

  throw new Error("Invalid type " + field.type);
}

/**
 * Generates a decoder specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
function decoder(mtype) {
    /* eslint-disable no-unexpected-multiline */
    var gen = util.codegen(["r", "l"], mtype.name + "$decode")
    ("if(!(r instanceof Reader))")
        ("r=Reader.create(r)")
    ("var c=l===undefined?r.len:r.pos+l,m=new this.ctor" + (mtype.fieldsArray.filter(function(field) { return field.map; }).length ? ",k,value" : ""))
    ("while(r.pos<c){")
        ("var t=r.uint32()");
    // if (mtype.group) gen
    //     ("if((t&7)===4||t==0)")
    //         ("break");
    gen
        ("switch(t>>>3){");

    var i = 0;
    for (; i < /* initializes */ mtype.fieldsArray.length; ++i) {
        var field = mtype._fieldsArray[i].resolve(),
            type  = field.resolvedType instanceof Enum ? "int32" : field.type,
            ref   = "m" + util.safeProp(field.name),
            tag = ((field.id << 3) | (getFieldType(field))) >>> 0;
        //
        // if (/VehicleData/.test(mtype) && field.id==11) {
        //   console.log('field', field);
        //   console.log('tag', tag);
        //   console.log(field.type, types.basic[field.type], type);
        //   console.log(Object.keys(field))
        //   // process.exit(0)
        // }

        // if (/GuiSettings/.test(mtype) && field.id==106) {
        //   console.log('field', field);
        //   console.log('tag', tag);
        //   console.log(field.type, getFieldType(field), type);
        //   console.log(Object.keys(field))
        //   // process.exit(0)
        // }
      //   const tag = ((field.number << 3) | basicWireType(field.type)) >>> 0;
      //   const tagCheck = code`
      //   if (tag !== ${tag}) {
      //     break;
      //   }
      // `;
        ;
        gen
            ("case %i: {", field.id)
              ("if (t !== %i) {", tag)
                (`console.log('tag ${field} ${field.type} ${getFieldType(field)}', t, %i, r.pos)`, tag)
                (`debugger`)
                ("break")
              ("}");

        // if (/LegacyVehicleState/.test(mtype) && field.id==55) {
        //   console.log('field', field);
        //   console.log('tag', tag);
        // }

        // Map fields
        if (field.map) { gen
                ("if(%s===util.emptyObject)", ref)
                    ("%s={}", ref)
                ("var c2 = r.uint32()+r.pos");

            if (types.defaults[field.keyType] !== undefined) gen
                ("k=%j", types.defaults[field.keyType]);
            else gen
                ("k=null");

            if (types.defaults[type] !== undefined) gen
                ("value=%j", types.defaults[type]);
            else gen
                ("value=null");

            gen
                ("while(r.pos<c2){")
                    ("var tag2=r.uint32()")
                    ("switch(tag2>>>3){")
                        ("case 1: k=r.%s(); break", field.keyType)
                        ("case 2:");

            if (types.basic[type] === undefined) gen
                            ("value=types[%i].decode(r,r.uint32())", i); // can't be groups
            else gen
                            ("value=r.%s()", type);

            gen
                            ("break")
                        ("default:")
                            ("r.skipType(tag2&7)")
                            ("break")
                    ("}")
                ("}");

            if (types.long[field.keyType] !== undefined) gen
                ("%s[typeof k===\"object\"?util.longToHash(k):k]=value", ref);
            else gen
                ("%s[k]=value", ref);

        // Repeated fields
        } else if (field.repeated) { gen

                ("if(!(%s&&%s.length))", ref, ref)
                    ("%s=[]", ref);

            // Packable (always check for forward and backward compatiblity)
            if (types.packed[type] !== undefined) gen
                ("if((t&7)===2){")
                    ("var c2=r.uint32()+r.pos")
                    ("while(r.pos<c2)")
                        ("%s.push(r.%s())", ref, type)
                ("}else");

            // Non-packed
            if (types.basic[type] === undefined) gen(field.resolvedType.group
                    ? "%s.push(types[%i].decode(r))"
                    : "%s.push(types[%i].decode(r,r.uint32()))", ref, i);
            else gen
                    ("%s.push(r.%s())", ref, type);

        // Non-repeated
        } else if (types.basic[type] === undefined) gen(field.resolvedType.group
                ? "%s=types[%i].decode(r)"
                : "%s=types[%i].decode(r,r.uint32())", ref, i);
        else gen
                ("%s=r.%s()", ref, type);
        gen
                ("continue")
            ("}");
        // Unknown fields
    }
    // gen
    //         ("default:")
    //             ("r.skipType(t&7)")
    //             ("continue")

    gen("}");

    gen("if ((t&7) === 4 || t === 0) {")
      ("break")
    ("}")
    ("r.skipType(t & 7)")

  gen("}")

    // Field presence
    for (i = 0; i < mtype._fieldsArray.length; ++i) {
        var rfield = mtype._fieldsArray[i];
        if (rfield.required) gen
    ("if(!m.hasOwnProperty(%j))", rfield.name)
        ("throw util.ProtocolError(%j,{instance:m})", missing(rfield));
    }

    return gen
    ("return m");
    /* eslint-enable no-unexpected-multiline */
}
