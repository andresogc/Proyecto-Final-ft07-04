import React from "react";
import { Route } from "react-router-dom";
import Login from "components/Login/Login";
import Nav from "components/Nav/Nav";
import Home from 'components/Home/Home';
import GrupoDetail from "components/GrupoDetail/GrupoDetail";
import Registro from "components/Registro/Registro";
import Cohortes from "components/Cohortes/Cohortes";
import Activos from "components/Cohortes/Activos";
import Inactivos from "components/Cohortes/Inactivos";
import PanelControlStudents from 'components/PanelControlStudents/panelControl';
import MiCohorte from "./components/PMsYAlumnos/MiCohorte"
import Rendimiento from "./components/PMsYAlumnos/Rendimiento"


function App() {
  return (
    <>
      <Nav />
      <Route exact path='/' component={Login} />
      <Route exact path='/MiCohorte/:id' component={MiCohorte} />
      <Route exact path='/MisDatos/:id' component={Rendimiento} />
      <Route exact path='/Home' component={Home} />
      <Route exact path='/GrupoDetail' component={GrupoDetail} />
      <Route exact path='/Registro' component={Registro} />
      <Route exact path="/cohortes" component={Cohortes} />
      <Route exact path="/activos/:id" component={Activos} />
      <Route exact path="/inactivos/:id" component={Inactivos} />
      <Route exact path='/PanelControlStudent' component={PanelControlStudents} />
    </>
  );
}

export default App;
