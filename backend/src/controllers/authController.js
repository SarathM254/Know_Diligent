import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const demoLogin = async (req, res) => {
  try {
    const { role, userId } = req.body;
    if (!['owner', 'salesman', 'operator'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const payload = { role };
    if (userId) {
      payload.id = userId;
    }

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );
    
    return res.status(200).json({ success: true, token });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const verifyOwnerPIN = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) {
      return res.status(400).json({ error: "PIN is required" });
    }

    const expectedPin = process.env.OWNER_PIN || "1234";

    if (pin.toString() === expectedPin.toString()) {
      // Sign a JWT token
      const token = jwt.sign(
        { role: 'owner' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1d' } // Token valid for 1 day
      );
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ error: "Invalid Owner PIN" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Google credentials token is required" });
    }

    // Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ error: "Invalid Google payload" });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name;

    // Search for user in database
    let user = await User.findOne({ email });

    // If not found in database, check if it matches the OWNER_EMAIL in env to bootstrap
    if (!user) {
      const ownerEmail = process.env.OWNER_EMAIL ? process.env.OWNER_EMAIL.toLowerCase().trim() : null;
      if (ownerEmail && email === ownerEmail) {
        // Automatically bootstrap this user as an owner
        user = new User({
          name,
          email,
          role: "owner",
        });
        await user.save();
        console.log(`🚀 Bootstrapped initial Owner account for email: ${email}`);
      } else {
        // Return 403 Forbidden since the email is not registered
        return res.status(403).json({
          error: "Your Google email is not registered on this system. Please contact the administrator to gain access."
        });
      }
    }

    // Sign our local session token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      token,
      role: user.role,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        salesmanId: user.salesmanId,
        broughtForwardDebt: user.broughtForwardDebt || 0,
      }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ error: error.message || "Failed to authenticate with Google." });
  }
};
