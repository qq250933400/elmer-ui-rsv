// tslint:disable: no-var-requires
import "colors";
// import express, { NextFunction, Request, Response } from "express";
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const { NextFunction, Request, Response } = require("express");
const express = require("express");
const app = express();
const renderRouter = require("./routers");

app.set("views", path.join(__dirname, "../public/views"));
app.set("view engine", "ejs");
// app.use(())
app.use((req:Request, res:Response, next:Function) => {
    const type = req.method || "GET";
    const time = (new Date()).toLocaleString();
    const url = req.url;
    // tslint:disable-next-line: no-console
    console.log(`[${type}][${time}] ${url}`.blue);
    next();
});
app.use(express.json());
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());

app.use("/", renderRouter);

app.use("/public", express.static(path.resolve(__dirname, "../public")));
app.use(express.static("../public"));
app.use((req:Request, res:Response, next:Function):void => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "developement" ? err : {};
    // tslint:disable-next-line: no-console
    console.error(err);
    res.status(err.status || 500);
    res.send(err);
});

export default app;

// tslint:enable: no-var-requires
