import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Trash2, Calculator, Pause } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { posApi, inventoryApi, managementApi, cashApi } from "../../lib/api";
import { PosSession } from "../../types/api";
import toast from "react-hot-toast";
import { ItemSelect } from "../../components/ItemSelect";
import { CustomerSelect } from "../../components/CustomerSelect";

const paymentSchema = z.object({
  method: z.enum(["CASH", "TRANSFER", "CARD"]),
  cashAccountId: z.string().cuid().optional(),
  amount: z.number().positive("Amount must be positive"),
});

const posSaleSchema = z.object({
  customerId: z.string().optional(),
  saleLines: z.array(
    z.object({
      itemId: z.string(),
      qty: z.number(),
      unitPrice: z.number(),
      discountPercent: z.number().min(0).max(100).default(0),
    }),
  ),
  payments: z.array(paymentSchema).min(1, "At least one payment is required"),
  notes: z.string().optional(),
});

type PosSaleFormData = z.infer<typeof posSaleSchema>;

interface PosTerminalProps {
  session: PosSession;
  onClose: () => void;
  onSaleComplete: () => void;
  resumedSale?: any;
}

const PosTerminal = ({
  session,
  onClose,
  onSaleComplete,
  resumedSale,
}: PosTerminalProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [itemStocks, setItemStocks] = useState<Record<string, number>>({});
  const [entryQty, setEntryQty] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemNamesById, setItemNamesById] = useState<Record<string, string>>(
    {},
  );
  const itemNameCacheRef = useRef<Record<string, string>>({});

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PosSaleFormData>({
    resolver: zodResolver(posSaleSchema),
    defaultValues: {
      saleLines: [],
      payments: [{ method: "CASH", cashAccountId: "", amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "saleLines",
  });

  const {
    fields: paymentFields,
    append: appendPayment,
    remove: removePayment,
  } = useFieldArray({
    control,
    name: "payments",
  });

  const watchedCustomerId = watch("customerId");
  const watchedLines = watch("saleLines");
  const watchedPayments = watch("payments") || [];

  const { data: items } = useQuery({
    queryKey: ["pos-itemss", "FINISHED_GOODS"],
    queryFn: () => inventoryApi.getItems({ type: "FINISHED_GOODS", limit: 50 }),
  });

  const itemMap = useMemo(() => {
    return new Map((items?.items ?? []).map((item: any) => [item.id, item]));
  }, [items]);

  // Load Resumed Sale Data if passed
  useEffect(() => {
    if (resumedSale) {
      reset({
        customerId: resumedSale.customerId || undefined,
        saleLines:
          resumedSale.pendingSaleLines?.map((line: any) => ({
            itemId: line.itemId,
            qty: Number(line.qty),
            unitPrice: Number(line.unitPrice),
            discountPercent: Number(line.discountPercent || 0),
          })) || [],
        payments: resumedSale.payments?.map((pay: any) => ({
          method: pay.method,
          cashAccountId: pay.cashAccountId,
          amount: Number(pay.amount),
        })) || [{ method: "CASH", cashAccountId: "", amount: 0 }],
        notes: resumedSale.notes || "",
      });

      if (resumedSale.customerId) {
        const customer = customersWithBalances?.customers?.find(
          (c: any) => c.id === resumedSale.customerId,
        );
        setSelectedCustomer(customer || null);
      }
    }
  }, [resumedSale, reset]);

  useEffect(() => {
    const itemIds = Array.from(
      new Set(
        watchedLines
          .map((line) => line.itemId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const missingIds = itemIds.filter((id) => {
      return !itemNameCacheRef.current[id] && !itemMap.has(id);
    });

    if (!missingIds.length) return;

    let isCancelled = false;

    const loadMissingNames = async () => {
      for (const id of missingIds) {
        try {
          const selectedItem = await inventoryApi.getItemById(id);
          if (isCancelled) return;
          const name = selectedItem?.name ?? "";
          itemNameCacheRef.current[id] = name;
          setItemNamesById((prev) =>
            prev[id] === name ? prev : { ...prev, [id]: name },
          );
        } catch (error) {
          console.error("Failed to fetch item name", error);
        }
      }
    };

    void loadMissingNames();

    return () => {
      isCancelled = true;
    };
  }, [watchedLines.map((line) => line.itemId).join(","), itemMap]);

  const getItemName = (itemId: string) => {
    if (!itemId) return "";
    return (
      itemNamesById[itemId] ??
      itemNameCacheRef.current[itemId] ??
      itemMap.get(itemId)?.name ??
      ""
    );
  };

  const { data: customersWithBalances } = useQuery({
    queryKey: ["customers-with-balances"],
    queryFn: () => posApi.getCustomersWithBalances(),
  });

  const { data: companyInformations } = useQuery({
    queryKey: ["company-info-for-receipt"],
    queryFn: () => managementApi.getCompanySettings(),
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["cash-accounts-for-pos"],
    queryFn: () => cashApi.getCashAccounts(),
  });

  const filteredAccounts = cashAccounts?.accounts?.filter(
    (account: any) => account.name !== "Memo Clearing",
  );

  // Update Product price for a customer
  useEffect(() => {
    const setPrices = async () => {
      for (let index = 0; index < watchedLines.length; index++) {
        const line = watchedLines[index];
        if (!line.itemId) continue;

        try {
          const selectedItem = await inventoryApi.getItemById(line.itemId);
          setItemStocks((prev) => ({
            ...prev,
            [line.itemId]: selectedItem.stockQty || 0,
          }));

          if (selectedCustomer && selectedItem) {
            const groupPrice = selectedItem.priceList?.find(
              (p: any) =>
                (p.customerGroup || "").trim() ===
                (selectedCustomer?.customerGroupName || "").trim(),
            );
            const unitPrice = groupPrice
              ? groupPrice.price
              : selectedItem.defaultPrice || 0;

            setValue(`saleLines.${index}.unitPrice`, unitPrice, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        } catch (err) {
          console.error("Failed to fetch item price", err);
        }
      }
    };

    setPrices();
  }, [
    watchedCustomerId,
    watchedLines.map((l) => l.itemId).join(","),
    selectedCustomer,
  ]);

  useEffect(() => {
    if (watchedCustomerId) {
      const customer = customersWithBalances?.customers?.find(
        (c: any) => c.id === watchedCustomerId,
      );
      setSelectedCustomer(customer);
    } else {
      setSelectedCustomer(null);
    }
  }, [watchedCustomerId, customersWithBalances]);

  const subtotal = watchedLines.reduce((sum, l) => {
    const total = l.qty * l.unitPrice;
    const discount = (total * (l.discountPercent || 0)) / 100;
    return sum + (total - discount);
  }, 0);

  const totalPaid = watchedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0,
  );

  const changeAmount = Math.max(0, totalPaid - subtotal);

  const calculateTotals = () => {
    const subtotal = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
      const discount = (lineTotal * (line.discountPercent || 0)) / 100;
      return sum + (lineTotal - discount);
    }, 0);

    const taxAmount = 0;
    const discountAmount = watchedLines.reduce((sum, line) => {
      const lineTotal = (line.qty || 0) * (line.unitPrice || 0);
      return sum + (lineTotal * (line.discountPercent || 0)) / 100;
    }, 0);

    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, discountAmount, totalAmount };
  };

  const { discountAmount, totalAmount } = calculateTotals();

  // Complete and commit POS sale
  const onSubmit = async (data: PosSaleFormData) => {
    try {
      if (!data.saleLines.length) {
        toast.error("Please select at least one product");
        return;
      }

      for (const line of data.saleLines) {
        if (line.qty <= 0) {
          toast.error("Quantity must be greater than zero");
          return;
        }
        if (line.unitPrice < 0) {
          toast.error("Unit price must be greater than zero");
          return;
        }
      }

      const result = await posApi.createSale({
        sessionId: session.id,
        customerId: data.customerId,
        saleLines: data.saleLines.filter(
          (line) => line.itemId && line.itemId.trim() !== "",
        ),
        subtotal,
        totalAmount: totalAmount,
        payments: data.payments,
        totalPaid,
        changeAmount,
        notes: data.notes,
        pendingSaleId: resumedSale?.id,
      });

      await handlePrintReceipt(result.id);
      toast.success("Sale completed successfully");
      onSaleComplete();
    } catch (err) {
      console.error("POS Sale error:", err);
      toast.error("Failed to complete sale");
    }
  };

  // Pause Sale Handler
  const handlePauseSale = async () => {
    try {
      const data = getValues();
      const validLines = (data.saleLines || []).filter(
        (line) => line.itemId && line.itemId.trim() !== "",
      );

      if (!validLines.length) {
        toast.error("Please add at least one product before pausing");
        return;
      }

      await posApi.createPendingSale({
        id: resumedSale?.id,
        sessionId: session.id,
        customerId: data.customerId,
        saleLines: validLines,
        subtotal,
        totalAmount: totalAmount,
        payments: data.payments,
        totalPaid,
        changeAmount,
        notes: data.notes,
      });

      toast.success("Sale paused successfully");
      onSaleComplete();
      onClose();
    } catch (err) {
      console.error("Pause sale error:", err);
      toast.error("Failed to pause sale");
    }
  };

  const handlePrintReceipt = async (saleId: string) => {
    try {
      const printData = await posApi.printReceipt(saleId);
      const printerWidth = localStorage.getItem("printerWidth") || "80";
      const paperWidth = `${printerWidth}mm`;

      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) throw new Error("Unable to open print window");

      const receiptHTML = `
      <html>
        <head>
          <title>Receipt - ${printData.documentNo}</title>
          <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            body { font-family: Arial, sans-serif; width: ${paperWidth}; padding: 5mm; margin: 0; }
            h1, h2 { margin: 5px 0; font-size: 14px; text-align: center; }
            table { width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 10px; }
            th, td { padding: 2px; }
            th { border-bottom: 1px solid #000; text-align: left; }
            td { text-align: right; }
            td:first-child { text-align: left; }
            .totals { border-top: 1px solid #000; padding-top: 5px; font-size: 12px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
          </style>
        </head>
        <body>
          <div>
            <h1>${companyInformations.name} </h1>
            <h2>${companyInformations.address}</h2>
            <h2>${companyInformations.phone}</h2>
          </div>
          <div style="text-align: center; margin-bottom: 15px;">
            <h1>SALES RECEIPT</h1>
            <h2>${printData.documentNo}</h2>
            <p>${new Date(printData.date).toLocaleString()}</p>
          </div>
          ${printData.customer ? `<div style="margin-bottom: 10px; font-size: 12px;"><strong>Customer:</strong> ${printData.customer.name}<br><strong>Code:</strong> ${printData.customer.code}</div>` : ""}
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              ${printData.items.map((item: any) => `<tr><td>${item.name}</td><td>${item.qty}</td><td>₦${item.unitPrice.toLocaleString()}</td><td>₦${item.lineTotal.toLocaleString()}</td></tr>`).join("")}
            </tbody>
          </table>
          <div class="totals">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span> <span>₦${printData.totals.subtotal.toLocaleString()}</span></div>
            ${printData.totals.discountAmount > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Discount:</span> <span>-₦${printData.totals.discountAmount.toLocaleString()}</span></div>` : ""}
            <div style="display: flex; justify-content: space-between; font-weight: bold;"><span>Total:</span> <span>₦${printData.totals.totalAmount.toLocaleString()}</span></div>
            ${printData.payments?.map((payment: any) => `<div style="display: flex; justify-content: space-between;"><span>Paid (${payment.method}):</span><span>₦${payment.amount.toLocaleString()}</span></div>`).join("") || ""}
            <div style="display: flex; justify-content: space-between;"><span>Change:</span><span>₦${printData.totals.changeAmount.toLocaleString()}</span></div>
          </div>
          <div class="footer">Cashier: ${printData.cashier.name}<br>Thank you for your business!<br>Bizlens Accounting Software-08033124491</div>
          <script>
            window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }
          </script>
        </body>
      </html>`;

      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
    } catch (error) {
      console.error("Print receipt error:", error);
    }
  };

  // auto fill with walk-in customer
  useEffect(() => {
    if (!customersWithBalances?.customers?.length) return;
    const walkInCustomer = customersWithBalances.customers.find(
      (c: any) => c.name?.toLowerCase() === "walk-in customer",
    );
    if (walkInCustomer && !getValues("customerId")) {
      setValue("customerId", walkInCustomer.id);
      setSelectedCustomer(walkInCustomer);
    }
  }, [customersWithBalances, getValues, setValue]);

  const addItemToSale = (itemId: string, qty: number, discountPercent = 0) => {
    const existingIndex = watchedLines.findIndex(
      (line) => line.itemId === itemId,
    );
    if (existingIndex >= 0) {
      const currentQty = getValues(`saleLines.${existingIndex}.qty`);
      setValue(`saleLines.${existingIndex}.qty`, currentQty + qty, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success(`${getItemName(itemId)} quantity increased`);
      return;
    }
    append({ itemId, qty, unitPrice: 0, discountPercent });
  };

  const handleItemSelected = (itemId: string) => {
    if (!itemId) return;
    addItemToSale(itemId, entryQty);
    setEntryQty(1);
    setSelectedItemId("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto lg:overflow-hidden">
      <div className="min-h-screen w-screen flex items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-7xl h-screen sm:h-[95vh] bg-white rounded-none sm:rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
          {/* HEADER */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200 flex items-center justify-between bg-white">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                New Sale
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm">
                Session #{session.sessionNo}{" "}
                {resumedSale ? `(Resumed ${resumedSale.saleNo})` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <Calculator className="w-5 h-5" />
              </button>

              {/* PAUSE BUTTON */}
              <button
                type="button"
                onClick={handlePauseSale}
                className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200"
                title="Pause Sale"
              >
                <Pause className="w-5 h-5" />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-red-100 hover:bg-red-500 text-red-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-gray-50"
          >
            {/* LEFT SECTION (Main workspace - items, inputs) */}
            <div className="w-full lg:w-2/3 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col bg-gray-50">
              {/* CUSTOMER + NOTES */}
              <div className="p-4 sm:p-5 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                    Customer
                  </label>
                  <CustomerSelect
                    customers={customersWithBalances?.customers || []}
                    value={watch("customerId")}
                    onChange={(val) => {
                      setValue("customerId", val);
                      const customer = customersWithBalances?.customers?.find(
                        (c: any) => c.id === val,
                      );
                      setSelectedCustomer(customer || null);
                    }}
                    error={errors.customerId?.message}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                    Notes
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={2}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Optional sale notes"
                  />
                </div>
              </div>

              {/* Item Entry Panel */}
              <div className="bg-white border-b border-gray-200 p-4 sm:p-5">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">
                    Add Item
                  </h3>

                  <p className="text-gray-600 font-semibold">
                    {fields.length > 0 ? fields.length + " items added" : ""}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-3 sm:gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">
                      Qty
                    </label>
                    <input
                      type="number"
                      //min={0}
                      value={entryQty}
                      onChange={(e) => setEntryQty(Number(e.target.value) || 1)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">
                      Search Item
                    </label>
                    <ItemSelect
                      noZeroItem
                      value={selectedItemId.trim()}
                      typeFilter="FINISHED_GOODS"
                      onChange={handleItemSelected}
                    />
                  </div>
                </div>
              </div>

              {/* ITEMS SCROLL AREA */}
              <div className="flex-1 overflow-y-visible lg:overflow-y-auto p-4 sm:p-5 space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-7 sm:gap-4 sm:items-end">
                      {/* ITEM NAME */}
                      <div className="flex justify-between items-center sm:col-span-3">
                        <div className="w-full">
                          <label className="text-xs sm:text-sm text-gray-600 block mb-1 font-medium sm:hidden">
                            Item
                          </label>
                          <div className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-800 font-medium">
                            {getItemName(watchedLines[index].itemId)}
                          </div>
                        </div>
                        {/* Mobile Remove Button */}
                        <div className="sm:hidden ml-2 pt-5">
                          {/* {fields.length > 0 && ( */}
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-2.5 bg-red-100 rounded-xl text-red-600 hover:bg-red-500 hover:text-white transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          {/* )} */}
                        </div>
                      </div>

                      {/* QTY, PRICE, DISCOUNT IN 3 COLUMNS ON MOBILE */}
                      <div className="grid grid-cols-3 gap-2 sm:contents">
                        <div>
                          <label className="text-xs sm:text-sm text-gray-600 block mb-1 font-medium">
                            Qty
                          </label>
                          <input
                            {...register(`saleLines.${index}.qty`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs sm:text-sm text-gray-600 block mb-1 font-medium">
                            Price
                          </label>
                          <input
                            {...register(`saleLines.${index}.unitPrice`, {
                              valueAsNumber: true,
                            })}
                            className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
                          />
                        </div>

                        <div>
                          <label className="text-xs sm:text-sm text-gray-600 block mb-1 font-medium">
                            Discount %
                          </label>
                          <input
                            {...register(`saleLines.${index}.discountPercent`, {
                              valueAsNumber: true,
                            })}
                            type="number"
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Desktop Remove Button */}
                      <div className="hidden sm:flex sm:justify-end sm:col-span-1">
                        {/* {fields.length > 1 && ( */}
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2.5 bg-red-100 rounded-xl text-red-600 hover:bg-red-500 hover:text-white transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {/* )} */}
                      </div>
                    </div>

                    {/* LINE TOTAL */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100 flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Line Total</span>
                      <span className="text-emerald-600 font-semibold">
                        ₦
                        {(() => {
                          const lineTotal =
                            (watchedLines[index]?.qty || 0) *
                            (watchedLines[index]?.unitPrice || 0);
                          const discount =
                            (lineTotal *
                              (watchedLines[index]?.discountPercent || 0)) /
                            100;
                          return (lineTotal - discount).toLocaleString();
                        })()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT SECTION (Summary & Payment details) */}
            <div className="w-full lg:w-1/3 bg-white flex flex-col p-4 sm:p-5 space-y-5 overflow-y-visible lg:overflow-y-auto">
              {/* PAYMENTS */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5">
                <h3 className="text-gray-900 font-semibold mb-4 text-sm sm:text-base">
                  Payments
                </h3>
                <div className="space-y-4">
                  {paymentFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="space-y-3 border-b border-gray-200 pb-4"
                    >
                      <select
                        {...register(`payments.${index}.method`)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="TRANSFER">Transfer</option>
                        <option value="CARD">Card</option>
                      </select>

                      <select
                        {...register(`payments.${index}.cashAccountId`)}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="">Select Account</option>
                        {filteredAccounts?.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>

                      <input
                        {...register(`payments.${index}.amount`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        placeholder="Amount"
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />

                      {paymentFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePayment(index)}
                          className="text-red-500 text-xs sm:text-sm font-medium hover:underline"
                        >
                          Remove payment
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    appendPayment({
                      method: "CASH",
                      cashAccountId: "",
                      amount: 0,
                    })
                  }
                  className="mt-3 text-emerald-600 text-xs sm:text-sm font-semibold hover:underline"
                >
                  + Add Payment Method
                </button>
              </div>

              {/* CUSTOMER DEBT */}
              {selectedCustomer && selectedCustomer.outstandingBalance > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-amber-700 text-xs sm:text-sm font-medium">
                    Outstanding Balance
                  </p>
                  <p className="text-amber-950 mt-1 text-base sm:text-lg font-bold">
                    ₦{selectedCustomer.outstandingBalance.toLocaleString()}
                  </p>
                </div>
              )}

              {/* SUMMARY CARD */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 sm:p-6">
                <h3 className="font-bold mb-4 text-gray-900 text-sm sm:text-base">
                  Order Summary
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">
                      ₦{subtotal.toLocaleString()}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount</span>
                      <span className="font-medium">
                        -₦{discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-emerald-200 pt-3.5 flex justify-between text-xl sm:text-2xl font-black text-gray-900">
                    <span>Total</span>
                    <span>₦{totalAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-emerald-800">
                    <span>Paid</span>
                    <span className="font-medium">
                      ₦{totalPaid.toLocaleString()}
                    </span>
                  </div>

                  {changeAmount > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Change</span>
                      <span className="font-medium">
                        ₦{changeAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="space-y-2.5 pt-4 sm:pt-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || totalPaid < totalAmount}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg shadow-emerald-600/10 disabled:opacity-50 disabled:shadow-none transition"
                >
                  {isSubmitting ? "Processing..." : "Complete Sale"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PosTerminal;
