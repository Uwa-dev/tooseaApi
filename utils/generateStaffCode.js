import Counter from "../models/counterModel.js";

export const generateStaffCode = async (role) => {
  const prefix =
    role === "OWNER"
      ? "OWN"
      : role === "MANAGER"
      ? "MGR"
      : "REC";

  const counter = await Counter.findOneAndUpdate(
    { name: role },
    { $inc: { value: 1 } },
    {
      returnDocument: "after",
      upsert: true,
    }
  );

  const number = String(counter.value).padStart(3, "0");

  return `${prefix}${number}`;
};