import express from "express";
const router = express.Router();
import User from "../Models/users";
import Cohorte from "../Models/cohorte";
import Group from "../Models/groups";
import Historial from "../Models/historial";
import axios from "axios";
import {passwordReset} from "../MailModel/ResetPass"

import * as bcrypt from "bcrypt";

const passport = require('passport');
const auth = require('../middleware/authenticate');
const jwt = require('jsonwebtoken')

router.use(passport.initialize())
require('./passport-config')(passport);

// Trae todos los usuarios
router.get("/", async (req, res) => {
  const result = await User.find();

  !result ? res.send("Hubo un error").status(400) : res.json(result);
});

//Devuelve todos los usarios que son alumnos o pm con los datos completos del
//cohorte y del grupo al que pertenecen
router.get("/estudiantes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    if (id !== "all") {
      await User.findOne(
        { _id: id }, function (err: any, users: any) {
          Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
            Group.populate(usersCH, { path: "standup" }, function (err, usersGrp) {
              Historial.populate(usersGrp, { path: "historia" }, function (err, usersCOM) {
                res.json(usersCOM).status(200);
              })
            });
          });
        }
      );
    } else {
      await User.find(
        { $or: [{ role: "alumno" }, { role: "PM" }] },
        function (err, users) {
          Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
            Group.populate(usersCH, { path: "standup" }, function (err, usersGrp) {
              Historial.populate(usersGrp, { path: "historia" }, function (err, usersCOM) {
                res.json(usersCOM).status(200);
              })
            });
          });
        }
      ).sort({name: 1});
    }
  } catch (e) {
    console.log(e, "Este es el error")
  }


});

//guardar usuario
// users/register
router.post("/register", async (req, res) => {
  const {
    firstname,
    lastname,
    thumbnail,
    role,
    email,
    password,
    cohorte,
  } = req.body;

  try {
    //revisar usuario a registrar sea unico
    let usuario = await User.findOne({ email });
    if (usuario) {
      return res
        .status(400)
        .send("El usuario ya existe");
    }
    //crear nuevo usuario
    usuario = new User({
      name: { firstname, lastname },
      email,
      password,
      thumbnail,
      role,
      cohorte,
    });

    //guardar usuario
    let result = await usuario.save();
    res.status(200).json(result);
  } catch (error) {
    res.sendStatus(400);
  }
});

//eliminar usuario
// users/delete/:id
router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await User.deleteOne({ _id: id });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).send({ success: false, msg: "Hubo un  error" });
  }
});


router.put('/modify/:id', async (req, res) => {
  const { id } = req.params;

  const user = await User.findOneAndUpdate({ _id: id }, req.body);


  if (!user) {
    res.status(404).send("No existe un usuario con ese id");
  } else { res.status(200).json(user); }
});

/// Modificar un usuario por id
router.put('/editprofile', async (req, res) => {

  const {authorization} = req.headers;
  const token:any = authorization?.split(" ");
  const datosUser = jwt.decode(token[1]);

  try {
    const user = await User.findOneAndUpdate({ _id: req.body.id }, req.body, { new: true });
    Cohorte.populate(user, { path: "cohorte" }, function (err, usersCH) {
      Group.populate(usersCH, { path: "standup" }, function (err, usersCOM: any) {

        const payload = {
          _id: usersCOM._id,
          role: usersCOM.role,
          email: usersCOM.email,
          github: usersCOM.github,
          cohorte: usersCOM.cohorte,
          standup: usersCOM.standup,
          name: usersCOM.name
        }
        //res.send(jwt.sign(payload, process.env.SECRET));
       if(datosUser.role === 'admin' && usersCOM.role === 'admin')  return res.json({ usersCOM, token: jwt.sign(payload, process.env.SECRET) });
       if(datosUser.role === 'PM' || datosUser.role === 'alumno')  return res.json({ usersCOM, token: jwt.sign(payload, process.env.SECRET) });
       if(datosUser.role === 'admin' && usersCOM.role !== 'admin') return res.json(usersCOM);
        
       

      })
    });

  } catch (error) {
    console.log(error)
    res.json({ msg: 'Hubo un error' }).status(400);
  }

});

//Devuelve todos los usuarios de un cohorte o "todos"
router.get("/cohorte/:id", async (req, res) => {
  const { id } = req.params;

  if (id === "todos") {
    await User.find({$or: [{ role: "alumno" }, { role: "PM" }]}, function (err, users) {
      Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
        Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
          Historial.populate(
            usersCOM,
            { path: "historia" },
            function (err, usersHis) {
              err
                ? res.send("Error con los usuarios").status(400)
                : res.json(usersHis).status(200);
            }
          );
        });
      });
    }).sort({ name: 1 });
  } else if(id === "none") {

    await User.find({$and: [
      {$or: [{ role: "alumno" }, { role: "PM" }]},
      {cohorte: undefined}
  ]}, function (err, users) {
      Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
        Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
          Historial.populate(
            usersCOM,
            { path: "historia" },
            function (err, usersHis) {
              err
                ? res.send("Error con los usuarios").status(400)
                : res.json(usersHis).status(200);
            }
          );
        });
      });
    }).sort({ name: 1 });    

  } else {
    await User.find({ cohorte: id }, function (err, users) {
      Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
        Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
          Historial.populate(
            usersCOM,
            { path: "historia" },
            function (err, usersHis) {
              err
                ? res.send("Error con los usuarios").status(400)
                : res.json(usersHis).status(200);
            }
          );
        });
      });
    }).sort({ name: 1 });
  }
});

//Elimina la asignacion de un usuario a un cohorte, recibe el id del usuario
//Resta la cantidad de alumnos del modelo cohorte
router.delete("/cohorte/:id", async (req, res) => {
  const { id } = req.params;

  //primero traemos el alumno
  const alumno = await User.findById(id);
  if (alumno) {
    //buscamos el cohorte
    const cohorte = await Cohorte.findById(alumno.cohorte);
    //Restamos 1 la cantidad actual de alumnos
    const newCantidad = cohorte.Alumnos - 1;
    //Updateamos la informacion
    await Cohorte.findOneAndUpdate({ _id: alumno.cohorte }, { Alumnos: newCantidad });
  }
  const usuarios = await User.findOneAndUpdate({ _id: id }, { cohorte: null });
  !usuarios ? res.send("hubo un error").status(400) : res.json(usuarios);
});

//Ruta que cambia al alumno de cohorte
//Resta 1 a la cantidad de alumnos al cohorte del que migra
//Suma 1 a la cantidad de alumnos al cohorta al que migra
router.put("/cohorte/:id", async (req, res) => {
  const { id } = req.params;
  const { cohorteName } = req.body;
  var usuarios;
  //Primero buscamos el alumno para ver en que cohorte está
  const alumno = await User.findById(id);
  if (alumno.cohorte) {       // si tiene cohorte asignado
    //Buscamos el cohorte del que migra
    const oldCohorte = await Cohorte.findById(alumno.cohorte);
    if (oldCohorte) {
      //Extraemos la cantidad de alumnos y le restamos uno
      const cantidad = oldCohorte.Alumnos - 1;
      //Updateamos la cantidad en el cohorte que abandona
      await Cohorte.findByIdAndUpdate(oldCohorte._id, { Alumnos: cantidad });
    };
  };
  //Buscamos el cohorte al que migra
  const cohorte = await Cohorte.findOne({ Nombre: cohorteName });
  if (cohorte) {
    //Extraemos la cantidad de alumnos y le sumamos uno
    const cantidad = cohorte.Alumnos + 1;
    //Updateamos la cantidad de alumnos del cohorte al que migra
    await Cohorte.findByIdAndUpdate(cohorte._id, { Alumnos: cantidad });
    //Updateamos el cambio de cohorte en el alumno
    usuarios = await User.findByIdAndUpdate(id, { cohorte: cohorte._id });
  }
  !usuarios ? res.send("hubo un error").status(400) : res.json(usuarios);
});

//Ruta que devuelve los instructores disponibles
router.get("/disponibles", async (req, res) => {
  const instructores = await User.find({ role: "instructor" });
  let final = [];
  for (let i = 0; i < instructores.length; i++) {
    let disponible = await Cohorte.find({ Instructor: instructores[i]._id, Active: true });
    if (disponible.length === 0) {
      final.push(instructores[i])
    }
  }
  final ? res.json(final) : res.sendStatus(400);
});



// Ruta para verificar el usuario de GitHub

async function getUser(username: any) {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${username}`
    );
    return response;
  } catch (error) {
    console.log(error);
  }
}


router.get('/github/:username', async (req, res) => {
  let { username } = req.params;

  const userStatus = await getUser(username);

  userStatus === undefined
    ? res.send(false).status(200)
    : res.send(true).status(200);
});

// Ruta para buscar un usuario por nombre y apellido (req.body)
// NO USADA AL FINAL, DESCOMENTAR SI ES NECESARIO

// router.get('/name', async (req, res) => {
//   const { name } = req.body;
//   const firstname : string = name.firstname;
//   const lastname : string = name.lastname;
//   const user = await User.find({name: { firstname, lastname}});
//   !user ? res.send('Hubo un error') : res.json(user);

// });

// Ruta para buscar un usuario por nombre y apellido (queryStrings)
router.get('/search?', async (req, res) => {
  let { firstname, lastname, id } = req.query;

  if (firstname !== "undefined" && firstname !== "" && !!firstname) {
    firstname = firstname.toString()
    firstname = firstname.charAt(0).toUpperCase() + firstname.slice(1).toLowerCase()
  }
  if(lastname === id) {
    lastname = ""
  }
  if (lastname !== "undefined" && lastname !== "" && !!lastname) {
    lastname = lastname.toString()
    lastname = lastname.charAt(0).toUpperCase() + lastname.slice(1).toLowerCase()
  }

  let user;

  
  if(id?.length === 24){
    if(firstname === id){
      user = await User.find({$and:[
        {cohorte: id},
        {role: "alumno"}
      ]}, "+name", null, function (err, us) {
        Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
          Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
            err ? res.send('Hubo un error').status(400) : res.json(usfull);
          })
        })
      });  
    } else if (lastname === "") {
      user = await User.find({$and: [
        {cohorte: id}, 
        {$or: [{ "name.firstname": firstname }, { "name.lastname": firstname }]}
      ]}, "+name", null, function (err, us) {
        Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
          Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
            err ? res.send('Hubo un error').status(400) : res.json(usfull);
          })
        })
      });
    } else if(firstname !== id && lastname !== id) {
      user = await User.find({$and: [
        {cohorte: id}, 
        {
          $or: [{ "name.firstname": firstname, "name.lastname": lastname },
          { "name.firstname": lastname, "name.lastname": firstname }]},
        {role: "alumno"}
      ]}, "+name", null, function (err, us) {
        Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
          Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
            err ? res.send('Hubo un error').status(400) : res.json(usfull);
          })
        })
      });
    }


  }else if(firstname === "Todos"){
    user = await User.find({ $or: [{ role: "alumno" }, { role: "PM" }]}, "+name", null, function (err, us) {
      Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
        Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
          err ? res.send('Hubo un error').status(400) : res.json(usfull);
        })
      })
    });  
  }else if(lastname === "All"){
    user = await User.find({cohorte: firstname}, "+name", null, function (err, us) {
      Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
        Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
          err ? res.send('Hubo un error').status(400) : res.json(usfull);
        })
      })
    });  
  } else if (lastname === "undefined" || lastname === "") {
      user = await User.find({$and : 
        [{ $or: [{ "name.firstname": firstname }, { "name.lastname": firstname }]},
         {$or: [{role: "alumno"}, {role: "PM"}]}]},
         "+name", null, function (err, us) {
        Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
          Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
            err ? res.send('Hubo un error').status(400) : res.json(usfull);
          })
        })
      });
    } else {
      user = await User.find({$and :
        [{
        $or: [{ "name.firstname": firstname, "name.lastname": lastname },
        { "name.firstname": lastname, "name.lastname": firstname }]},
      {$or: [{role: "alumno"}, {role: "PM"}]} ]},
       "+name", null, function (err, us) {
        Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
          Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
            err ? res.send('Hubo un error').status(400) : res.json(usfull);
          })
        })
      });
    }
  
    
  });


//Ruta para buscar por github
router.get("/searchgithub", async (req, res) => {
  const { git} = req.query;

  const github = Array.isArray(git) ? git[0] : git

 const user = await User.find({github: github}, "+name", null, function (err, us) {
      Cohorte.populate(us, { path: "cohorte" }, function (err, usIncCoh) {
        Group.populate(usIncCoh, { path: "standup" }, function (err, usfull) {
          err ? res.send('Hubo un error').status(400) : res.json(usfull);
        })
      })
    }); 
})


//Ruta que actualiza las notas de un checkpoint de uma historia
router.put("/historia/:historiaId", (req, res) => {
  const { historiaId } = req.params;
  let { checkpoint, cohorteId, tests } = req.body;
  tests = parseInt(tests);
  //Primero buscamos la historia del alumno
  Historial.findById(historiaId)
    .exec()
    .then((historia: any) => {
      //Despues buscamos el cohorte especifico
      let indice: any;
      for (let i = 0; i < historia.Checkpoints.length; i++) {
        if (historia.Checkpoints[i].Cohorte == cohorteId) {
          indice = i;
        }
      }
      //Le modificamos la cantidad de tests pasados al objeto
      historia.Checkpoints[indice][checkpoint] = tests;
      //guardamos el objeto en la coleccion
      historia.save();
      return historia;
    })
    .then((historiaGuardada: any) => {
      //Si todo salio bien devolvemos la historia
      return res.json(historiaGuardada);
    })
    .catch((error: any) => {
      //Si todo salio mal devolvemos el error con el status 400
      return res.send(error).status(400);
    });
});


//////////////////////////////////////////////////////////////////////////////

/// Rutas para usar en grupos///////

router.get("/groupUsers/:id", async (req, res) => {
  const { id } = req.params;
  const users = await User.find({ standup: id, });
  res.json(users)
})

//Ruta que devuelve solo los alumnos del standup (NO LOS PMS !!!!)
router.get("/groupAlumnos/:standupId", async (req, res) => {
  const { standupId } = req.params;
  await User.find({ standup: standupId, role: "alumno" }, async function(err, alumnos) {
    await Historial.populate(alumnos, { path: "historia"}, function(err, alumnosCOM) {
      err ? res.send(err).status(400) : res.json(alumnosCOM);
    });
  });
});

router.get("/usercohorte/:id", async (req, res) => {
  const { id } = req.params
  const usuarios = await User.find({ role: "alumno", cohorte: id, standup: null })
  const PM = await User.find({ role: "PM", standup: null })
  !usuarios ? res.send("hubo un error").status(400) : res.json([usuarios, PM])
})


//ruta para que un usuario actualice el  password 
router.put('/change_password', auth, async (req, res, next) => {
  const { password, newPassword, confirmPassword, email } = req.body;
  if (!newPassword && !confirmPassword) return res.json({ success: false, msg: 'Inputs vacios por favor revise' }).status(400);
  if (newPassword === confirmPassword) {
    try {
      //revisar password actual coincida con el de la base de datos
      const userdb = await User.findOne({ email: email });
      const user = new User();
      const result = await user.comparePassword(password, userdb.password)
      //si password coincide con db entonces encryptar y actualizar en base de datos
      if (result) {
        const salt = await bcrypt.genSaltSync(10);
        const hash = await bcrypt.hashSync(newPassword, salt);
        await User.findOneAndUpdate({ email: email }, { $set: { password: hash } });
        res.json({ success: true, msg: 'El password se actualizo correctamente' }).status(200);
      } else {
        res.json({ success: false, msg: 'El password actual no coincide' }).status(400);
      }
    } catch (error) {
      res.json({ success: false, msg: 'Hubo un error' }).status(400);
    }
  } else {
    res.json({ success: false, msg: 'Input nuevo password no coincide con input confirmar password' }).status(400);
  }
});

//buscar usuario por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await User.findOne({ _id: id }, function (err: any, users: any) {
      Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
        Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
          res.json({ usersCOM }).status(200);
        })
      });
    });

  } catch (error) {
    console.log(error)
    res.json({ success: false, msg: 'Hubo un error' }).status(400);
  }
});

//Ruta que asigna cohorte a un usuario SIN
router.post("/assignCohorte/:id", async (req, res) => {
  const { id } = req.params;
  const { nvoCohorte } = req.body;
  
  var usuario = await User.findOneAndUpdate({ _id: id }, { cohorte: nvoCohorte }, { upsert: true })
  !usuario ? res.sendStatus(400) : res.json(usuario)
  
 });

router.put("/asistencia/:historiaId", async ( req, res) => {
  const { historiaId } = req.params;
  const { modulo, clase, valor } = req.body;

  let historia = await Historial.findById(historiaId);
  historia.Modulos[modulo].Clases[clase].Asistencia = valor;
  historia.save();

  historia ? res.json(historia) : res.send("Error al actualizar la asistencia").status(400);
});

router.put("/participa/:historiaId", async ( req, res ) => {
  const { historiaId } = req.params;
  const { modulo, clase, valor } = req.body;

  let historia = await Historial.findById(historiaId);
  historia.Modulos[modulo].Clases[clase].Participa = valor;
  historia.save();

  historia ? res.json(historia) : res.send("Error al actualizar la asistencia").status(400);
})


//Ruta que envía email de reseteo de contraseña
router.get("/newPassSend/:email", async (req, res) => {
  const { email } = req.params;
  
  if(!email) {
    return res.sendStatus(404);
  }

  const user = await User.findOne({email: email})
  
  if (!user) {
    return res.sendStatus(404)
  } else {
     passwordReset(user.toJSON())
     res.sendStatus(200)
  }

})

//Ruta que reemplaza la contraseña identificando al usuario por token
//Nota: es necesario encriptar la contraseña acá mismo
router.put("/newPassReturn", async (req, res) => {
 const {_id } = req.body.usersCOM
 const {confirmPass} = req.body
 const salt = await bcrypt.genSaltSync(10);
 const hash = await bcrypt.hashSync(confirmPass, salt);

  const reseteo = await User.findOneAndUpdate({ _id: _id },{password: hash}, null, function (err: any, users: any) {
    Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
      Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
        if(err) return res.sendStatus
        res.json(jwt.sign(usersCOM.toJSON(), process.env.SECRET)).status(200);
      })
    });
  });
});

router.put("/update/img_profile", async ( req, res ) => {
  const { id,img } = req.body;
  try {
    await User.findOneAndUpdate({ _id: id }, { $set: { thumbnail: img } });
    res.json({msg:'la imagen se actualizo correctamente'}).status(400)

  } catch (error) {
    console.log(error)
  }
})


router.get("/asistancePromed/:standupId", async (req, res) => {
  const { standupId } = req.params;
  let arr = []
  let total: any[] = []
  try {
    let modulos: any = [{},{},{},{}];

    let asist = 0;
    //Primero traemos a los alumnos del standup
    const alumnos = await User.find({ standup: standupId, role: "alumno"}, async function(err, alumnos) {
      Historial.populate(alumnos, { path: "historia"}, function(err, alumnosCOM: any) {
        err ? res.send(err).status(400) : 
        alumnosCOM.forEach((alumno: any) => {
          alumno.historia.Modulos.forEach((hist: any, index: number) => {
            hist.Clases.forEach((clase: any) => {
              if (modulos[index].hasOwnProperty(clase.Nombre)) {
                modulos[index][clase.Nombre] += clase.Asistencia ? 1 : 0;
              } else {
                modulos[index][clase.Nombre] = clase.Asistencia ? 1 : 0;
              }
            })
          })
        })
        const superTotal = modulos.map((p: any) => {
          arr = Object.values(p)
          total = arr.map((c: any) => { return c / alumnos.length * 100 })
          return total
        })
        res.json(superTotal);
      })
    });


  } catch(e) {
    console.log(e)
  }
})
  
//Ruta para hacer un usuario editable

router.put('/editable/:id', async(req, res) => {
  const { id } = req.params;
  const user = await User.findOne({ _id: id });
  if(user.editable === false) {
    user.editable = true;
    var result = await user.save();
    
  }
  else {
    user.editable = false;
    var result = await user.save();
  }

  Cohorte.populate(result, { path: "cohorte" }, function (err, usersCH) {
    Group.populate(usersCH, { path: "standup" }, function (err, usersCOM: any) {
      
      res.status(200).json({usersCOM});

    })
  });


})


//"Rol === alumno => standup === standup vigente///
// |       O
//\ /     /|\
//        / \   persone ne binare
//rol === PM => standup === standup de OTRO COHORTE MAS NUevO.//// holi //

export default router;