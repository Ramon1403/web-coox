
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
require('dotenv').config();

const app = express();

// Configuración del logger para registrar errores
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(helmet()); // Seguridad mejorada con encabezados HTTP
app.use(compression()); // Compresión de respuestas HTTP


const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});



// Ruta para obtener todos los clientes
app.get('/clientes', (req, res) => {
  pool.query('SELECT * FROM clientes', (error, results) => {
    if (error) {
      logger.error('Error fetching clients:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// Ruta para insertar un nuevo cliente
app.post('/clientes', (req, res) => {
  const cliente = req.body;
  pool.query('INSERT INTO clientes SET ?', cliente, (error, results) => {
    if (error) {
      logger.error('Error inserting cliente:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ id: results.insertId, ...cliente });
  });
});

// Ruta para obtener todos los productos
app.get('/productos', (req, res) => {
  pool.query('SELECT * FROM productos', (error, results) => {
    if (error) {
      logger.error('Error fetching productos:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// Ruta para insertar un nuevo producto
app.post('/productos', (req, res) => {
  const producto = req.body;
  pool.query('INSERT INTO productos SET ?', producto, (error, results) => {
    if (error) {
      logger.error('Error inserting producto:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json({ id: results.insertId, ...producto });
  });
});

// Ruta para guardar una nueva orden
app.post('/save-order', (req, res) => {
  const { cliente_id, cliente_nombre, cliente_apellido, cliente_telefono, cliente_direccion, productos, total, metodo_pago, comentarios } = req.body;

  if (!cliente_id || !productos || !total || !metodo_pago) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const order = {
    cliente_id,
    cliente_nombre,
    cliente_apellido,
    cliente_telefono,
    cliente_direccion,
    productos: JSON.stringify(productos),
    total,
    metodo_pago,
    comentarios
  };

  pool.query('INSERT INTO orders SET ?', order, (err, result) => {
    if (err) {
      logger.error('Error saving order:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Order saved successfully', orderId: result.insertId });
  });
});

// Ruta para obtener todas las órdenes
app.get('/orders', (req, res) => {
  pool.query('SELECT * FROM orders', (error, results) => {
    if (error) {
      logger.error('Error fetching orders:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json(results);
  });
});

// Ruta para actualizar clientes
app.put('/clientes/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  pool.query('UPDATE clientes SET ? WHERE id = ?', [updatedData, id], (error, results) => {
    if (error) {
      logger.error('Error updating cliente:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Client updated successfully' });
  });
});

// Ruta para actualizar productos
app.put('/productos/:id', (req, res) => {
  const idProducto = req.params.id;
  const updatedData = req.body;
  pool.query('UPDATE productos SET ? WHERE idProducto = ?', [updatedData, idProducto], (error, results) => {
    if (error) {
      logger.error('Error updating producto:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ idProducto, ...updatedData });
  });
});

// Agregar una nueva categoría
app.post('/categorias', (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }

  const query = 'INSERT INTO categorias (nombre) VALUES (?)';
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    connection.query(query, [nombre], (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json({ id: results.insertId, nombre });
    });
  });
});


// Obtener todas las categorías
app.get('/categorias', (req, res) => {
  const query = 'SELECT * FROM categorias';
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    connection.query(query, (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json(results);
    });
  });
});


// Agregar un nuevo producto
app.post('/productos', (req, res) => {
  const { categoria, idProducto, codigoProducto, nombreProducto, precio } = req.body;

  if (!categoria || !idProducto || !codigoProducto || !nombreProducto || !precio) {
    return res.status(400).json({ error: 'Todos los campos son requeridos.' });
  }

  const query = 'INSERT INTO productos SET ?';
  const productoData = { categoria, idProducto, codigoProducto, nombreProducto, precio };

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    connection.query(query, productoData, (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(201).json({ id: results.insertId, ...productoData });
    });
  });
});


// Actualizar un producto existente
app.put('/productos/:id', (req, res) => {
  const idProducto = req.params.id;
  const updatedData = req.body;

  const query = 'UPDATE productos SET ? WHERE idProducto = ?';
  
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    connection.query(query, [updatedData, idProducto], (error, results) => {
      connection.release();
      if (error) {
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ idProducto, ...updatedData });
    });
  });
});















// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
