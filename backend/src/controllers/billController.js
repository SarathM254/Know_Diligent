import Bill from '../models/Bill.js';
import User from '../models/User.js';
import Brand from '../models/Brand.js';
import AppSettings from '../models/AppSettings.js';
import LedgerTransaction from '../models/LedgerTransaction.js';

const getActiveSystemDate = async () => {
  let settings = await AppSettings.findOne({ key: "global_config" });
  
  // Use explicit timezone to avoid Vercel UTC server offset issues
  const localStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  if (!settings) {
    settings = await AppSettings.create({ key: "global_config", operationalDate: localStr });
  } else {
    // Auto-sync logic: If real date is strictly greater than operational date, bring operational date up to real date
    if (localStr > settings.operationalDate) {
      settings.operationalDate = localStr;
      await settings.save();
    }
  }
  return settings.operationalDate;
};

export const getGlobalSystemDate = async (req, res) => {
  try {
    const operationalDate = await getActiveSystemDate();
    return res.status(200).json({ operationalDate });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createOrUpdateDraftBill = async (req, res) => {
  try {
    const { items, salesmanId } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Items array required." });

    const billingDate = await getActiveSystemDate();

    const mappedItems = await Promise.all(items.map(async (item) => {
      const brand = await Brand.findById(item.brandId).catch(() => null);
      return {
        brandId: item.brandId,
        quantity: Math.round(Number(item.quantity || 0) * 100) / 100,
        rateSnapShot: brand ? brand.retailPrice : (item.rate || 0),
        brandName: brand ? brand.name : (item.brandName || 'Unknown Brand')
      };
    }));

    const existingBill = await Bill.findOne({ salesmanId, billingDate });
    if (existingBill && existingBill.status !== 'draft' && existingBill.status !== 'submitted') {
      return res.status(400).json({ error: "Bill for today is locked down by management." });
    }

    let bill = await Bill.findOne({ salesmanId, billingDate });
    if (!bill) bill = new Bill({ salesmanId, billingDate });

    bill.items = mappedItems;
    bill.status = 'submitted';
    await bill.save();

    return res.status(201).json(bill);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const submitBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await Bill.findById(id);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    bill.status = 'submitted';
    await bill.save();
    return res.status(200).json(bill);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateBillStatusByOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body;

    let bill = await Bill.findById(id);
    if (!bill) return res.status(404).json({ error: 'Bill file matching parameters not found.' });

    // Apply item overrides first in memory if provided
    if (items && Array.isArray(items)) {
      const mappedItems = await Promise.all(items.map(async (item) => {
        const brand = await Brand.findById(item.brandId).catch(() => null);
        return {
          brandId: item.brandId,
          quantity: Math.round(Number(item.quantity || 0) * 100) / 100,
          rateSnapShot: brand ? brand.retailPrice : (item.rate || item.rateSnapShot || 0),
          brandName: brand ? brand.name : (item.brandName || 'Unknown Brand')
        };
      }));
      bill.items = mappedItems;
      bill.totalBillValue = bill.items.reduce((sum, item) => sum + (item.quantity * item.rateSnapShot), 0);
    }

    if (status === 'delivered' && bill.status !== 'delivered') {
      // ATOMIC CHECK: Ensure we only mark as delivered once
      const updatedBill = await Bill.findOneAndUpdate(
        { _id: id, status: { $ne: 'delivered' } },
        { 
          $set: { 
            status: 'delivered', 
            items: bill.items, 
            totalBillValue: bill.totalBillValue 
          } 
        },
        { new: true }
      );

      if (!updatedBill) {
        return res.status(400).json({ error: "Bill is already delivered or blocked by another process." });
      }

      bill = updatedBill; // sync local memory with db truth

      const salesman = await User.findById(bill.salesmanId);
      if (salesman) {
        const oldBF = salesman.broughtForwardDebt;
        salesman.broughtForwardDebt += bill.totalBillValue;
        await salesman.save();

        await LedgerTransaction.create({
          salesmanId: salesman._id,
          type: "bill_delivery",
          amount: bill.totalBillValue,
          description: `Bill verified and delivered for operational date: ${bill.billingDate}`,
          previousBF: oldBF,
          newBF: salesman.broughtForwardDebt
        });

        for (const item of bill.items) {
          await Brand.findByIdAndUpdate(
            item.brandId,
            { $inc: { inventoryCount: -Number(item.quantity) } }
          );
        }
      }
    } else {
      // Non-delivery standard updates
      if (status) bill.status = status;
      await bill.save();
    }
    return res.status(200).json(bill);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const pushGlobalSystemDate = async (req, res) => {
  try {
    const settings = await AppSettings.findOne({ key: "global_config" });
    if (!settings) return res.status(404).json({ error: "System matrix not initialized." });

    // Use explicit timezone to avoid Vercel UTC server offset issues
    const localStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    if (settings.operationalDate > localStr) {
      return res.status(400).json({ error: "Date already advanced beyond current real-world day." });
    }

    const currentDate = new Date(settings.operationalDate);
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
    
    if (dayOfWeek === 6) {
      // Leap over Sunday
      currentDate.setDate(currentDate.getDate() + 2);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    settings.operationalDate = currentDate.toISOString().split('T')[0];
    await settings.save();

    return res.status(200).json({ success: true, message: `System date pushed to ${settings.operationalDate}`, data: settings });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSalesmanBillHistory = async (req, res) => {
  try {
    const { salesmanId } = req.params;
    return res.status(200).json(await Bill.find({ salesmanId }).sort({ billingDate: -1 }).lean());
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPendingBillsForAdmin = async (req, res) => {
  try {
    const operationalDate = await getActiveSystemDate();
    
    // Show all submitted and delivered bills regardless of date.
    // Only show billed bills if they were billed on the current operational date.
    const bills = await Bill.find({
      $or: [
        { status: { $in: ['submitted', 'delivered'] } },
        { status: 'billed', billingDate: operationalDate }
      ]
    }).populate('salesmanId', 'name').lean();
    
    return res.status(200).json(bills.map(b => ({
      _id: b._id,
      salesmanName: b.salesmanId ? b.salesmanId.name : 'Unknown Profile',
      totalAmount: b.totalBillValue,
      status: b.status,
      date: b.billingDate,
      items: b.items
    })));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const operationalDate = await getActiveSystemDate();

    // 1. Total Salesman Exposure (Global)
    const salesmen = await User.find({ role: 'salesman' }).lean();
    const totalSalesmanBFDebt = salesmen.reduce((sum, s) => sum + (s.broughtForwardDebt || 0), 0);

    // 2. Load Volume for Operational Date
    const todaysBills = await Bill.find({ billingDate: operationalDate, status: { $in: ['delivered', 'billed'] } }).lean();
    
    let billedLoad = 0;
    let unbilledLoad = 0;

    todaysBills.forEach(bill => {
      // Calculate total volume (quantity) for this bill
      const billVolume = bill.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      
      if (bill.status === 'billed') {
        billedLoad += billVolume;
      } else if (bill.status === 'delivered') {
        unbilledLoad += billVolume;
      }
    });

    return res.status(200).json({
      operationalDate,
      totalSalesmanBFDebt,
      stockDelivered: {
        billed: billedLoad,
        unbilled: unbilledLoad
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
