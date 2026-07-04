import jwt from 'jsonwebtoken';

// Generic protection for any valid JWT
export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired session token." });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const verifySalesman = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== 'salesman' && req.user.role !== 'owner') {
      return res.status(403).json({ error: "Forbidden. Access is restricted to Salesmen." });
    }
    next();
  });
};

export const verifyOwner = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Access denied. No token provided." });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Invalid or expired session token." });
      }

      if (decoded.role !== 'owner') {
        return res.status(403).json({ error: "Forbidden. Access is restricted to Owner only." });
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const verifyOwnerOrOperator = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== 'owner' && req.user.role !== 'operator') {
      return res.status(403).json({ error: "Forbidden. Access is restricted to Owner or Operator." });
    }
    next();
  });
};
