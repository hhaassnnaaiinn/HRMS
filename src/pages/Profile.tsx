import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { Button } from "../components/ui/button";
import Input from "../components/ui/input"; // Default import (NO curly braces)

export default function Profile() {
  const { user } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email] = useState(user?.email || "");
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    // API call ya Supabase ke function se update logic likhna hoga
    console.log("Saving profile:", { name });
    setEditing(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Profile</h2>

      <div className="mb-4">
        <label className="block text-gray-600 text-sm">Full Name</label>
        {editing ? (
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        ) : (
          <p className="text-gray-800">{name}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-gray-600 text-sm">Email</label>
        <p className="text-gray-800">{email}</p>
      </div>

      {editing ? (
        <div className="flex space-x-2">
          <Button onClick={handleSave}>Save</Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button onClick={() => setEditing(true)}>Edit Profile</Button>
      )}
    </div>
  );
}
