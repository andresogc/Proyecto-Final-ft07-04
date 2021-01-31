import express from "express";
const router = express.Router();
import User from "../Models/users";
import Cohorte from "../Models/cohorte";
import Group from "../Models/groups";

// Trae todos los usuarios
router.get("/", async (req, res) => {
  const result = await User.find();

  !result ? res.send("Hubo un error").status(400) : res.json(result);
});

//Devuelve todos los usarios que son alumnos o pm con los datos completos del
//cohorte y del grupo al que pertenecen
router.get("/estudiantes", async (req, res) => {
  await User.find(
    { $or: [{ role: "alumno" }, { role: "PM" }] },
    function (err, users) {
      Cohorte.populate(users, { path: "cohorte" }, function (err, usersCH) {
        Group.populate(usersCH, { path: "standup" }, function (err, usersCOM) {
          res.json(usersCOM).status(200);
        });
      });
    }
  );
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
    standup,
  } = req.body;

  try {
    //revisar usuario a registrar sea unico
    let usuario = await User.findOne({ email });
    if (usuario) {
      return res
        .status(400)
        .json({ success: false, msg: "El usuario ya existe" });
    }
    //crear nuevo usuario
    usuario = new User({
      name: { firstname, lastname },
      email,
      password,
      thumbnail,
      role,
    });

    //guardar usuario
    let result = await usuario.save();
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
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
    console.log(error);
    res.status(400).send({ success: false, msg: "Hubo un  error" });
  }
});

// Modificar un usuario por id
router.put("/modify/:id", async (req, res) => {
  const { id } = req.params;

  const user = await User.findOneAndUpdate({ _id: id }, req.body);

  if (!user) {
    res.status(404).send("No existe un usuario con ese id");
  } else {
    res.status(200).json(user);
  }
});

//Devuelve todos los usuarios de un cohorte
router.get("/cohorte/:id", async (req, res) => {
  const { id } = req.params;
  const usuarios = await User.find({ cohorte: id });
  !usuarios ? res.send("hubo un error").status(400) : res.json(usuarios);
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
    await Cohorte.findOneAndUpdate({_id: alumno.cohorte}, {Alumnos: newCantidad});
  }
  const usuarios = await User.findOneAndUpdate({ _id: id }, { cohorte: null });
  console.log(usuarios);
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
  if(alumno.cohorte)  {       // si tiene cohorte asignado
    //Buscamos el cohorte del que migra
    const oldCohorte = await Cohorte.findById(alumno.cohorte);
    if (oldCohorte) {
      //Extraemos la cantidad de alumnos y le restamos uno
      const cantidad = oldCohorte.Alumnos - 1;
      //Updateamos la cantidad en el cohorte que abandona
      await Cohorte.findByIdAndUpdate(oldCohorte._id, {Alumnos: cantidad});
    };
  };
  //Buscamos el cohorte al que migra
  const cohorte = await Cohorte.findOne({ Nombre: cohorteName });
  if (cohorte) {
    //Extraemos la cantidad de alumnos y le sumamos uno
    const cantidad = cohorte.Alumnos + 1;
    //Updateamos la cantidad de alumnos del cohorte al que migra
    await Cohorte.findByIdAndUpdate(cohorte._id, {Alumnos: cantidad});
    //Updateamos el cambio de cohorte en el alumno
    usuarios = await User.findByIdAndUpdate(id, { cohorte: cohorte._id });
  }
  !usuarios ? res.send("hubo un error").status(400) : res.json(usuarios);
});

//Ruta que devuelve los instructores disponibles
router.get("/disponibles" , async (req, res) => {
  const instructores = await User.find({role: "instructor"});
  let final = [];
  for(let i = 0; i < instructores.length; i++) {
    let disponible = await Cohorte.find({Instructor: instructores[i]._id, Active: true});
    if (disponible.length === 0 ) {
      final.push(instructores[i])
    }
  }
  final ? res.json(final) : res.sendStatus(400);
});

export default router;
