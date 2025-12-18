import React, { useState, useEffect } from "react";
import samadhanLogo from "../assets/samadhan-logo.png";

import {
  MapPin,
  MessageSquare,
  ThumbsUp,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { supabase } from "./supabaseClient";

const CommunityProblemSolver = () => {
  const [problems, setProblems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("roads");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [solutionName, setSolutionName] = useState("");


  // Comment/solution states
  const [problemSolutions, setProblemSolutions] = useState({});
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [newSolution, setNewSolution] = useState("");

  // Fetch problems from Supabase
  const fetchProblems = async () => {
    const { data, error } = await supabase
      .from("problems")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setProblems(data || []);

      // Fetch solutions for all problems
      data?.forEach((problem) => {
        fetchSolutions(problem.id);
      });
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Fetch solutions for a problem
  const fetchSolutions = async (problemId) => {
    const { data, error } = await supabase
      .from("solutions")
      .select("*")
      .eq("problem_id", problemId)
      .order("created_at", { ascending: true });

    if (!error) {
      setProblemSolutions((prev) => ({
        ...prev,
        [problemId]: data,
      }));
    }
  };

  // Submit a new problem
 const handleSubmit = async (e) => {
  e.preventDefault();

  if (!imageFile) {
    alert("Please select an image");
    return;
  }

  try {
    setUploading(true);
    setProgress(10);

    // Clean file name
    const safeName = imageFile.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const fileName = `${Date.now()}_${safeName}`;

    setProgress(30);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("problem-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("Image upload failed. Make sure the bucket exists and is public.");
      setUploading(false);
      return;
    }

    setProgress(60);

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("problem-images")
      .getPublicUrl(fileName);

    const imageUrl = publicData?.publicUrl;

    if (!imageUrl) {
      alert("Failed to get image URL. Check your bucket settings.");
      setUploading(false);
      return;
    }

    setProgress(80);

    // Insert into table
    const { error: insertError } = await supabase.from("problems").insert({
      title,
      description,
      category,
      location,
      image: imageUrl,
      votes: 0,
      solutions: 0,
      status: "active",
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      alert("Failed to add problem. Check your table and RLS policies.");
      setUploading(false);
      return;
    }

    setProgress(100);
    alert("Problem submitted successfully 🚀");
    await fetchProblems();

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("roads");
    setLocation("");
    setImageFile(null);
    setPreviewUrl(null);
    setShowSubmitForm(false);
  } catch (err) {
    console.error(err);
    alert("Something went wrong: " + err.message);
  } finally {
    setUploading(false);
    setProgress(0);
  }
};


  // Upvote a problem
  const handleUpvote = async (id, currentVotes) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, votes: currentVotes + 1 } : p))
    );

    await supabase.from("problems").update({ votes: currentVotes + 1 }).eq("id", id);
  };

  const handleDownvote = async (problemId, currentDownvotes) => {
  // Update UI
  setProblems((prev) =>
    prev.map((p) =>
      p.id === problemId
        ? { ...p, downvotes: currentDownvotes + 1 }
        : p
    )
  );

  // Update DB
  await supabase
    .from("problems")
    .update({ downvotes: currentDownvotes + 1 })
    .eq("id", problemId);
};


  const handleToggleStatus = async (problemId, currentStatus) => {
  const newStatus = currentStatus === "solved" ? "active" : "solved";

  // UI update
  setProblems((prev) =>
    prev.map((p) =>
      p.id === problemId ? { ...p, status: newStatus } : p
    )
  );

  // DB update
  await supabase
    .from("problems")
    .update({ status: newStatus })
    .eq("id", problemId);
};


  // Add a solution
  const handleAddSolution = async (problemId) => {
    if (!newSolution.trim()) return;

    const { error } = await supabase.from("solutions").insert({
      problem_id: problemId,
      user_name: solutionName || "Anonymous",
      text: newSolution,
      

    });
    setSolutionName("");


    if (!error) {
      setNewSolution("");
      fetchSolutions(problemId);

      // Increment solutions count in problems table
      const problem = problems.find((p) => p.id === problemId);
      await supabase
        .from("problems")
        .update({ solutions: (problem.solutions || 0) + 1 })
        .eq("id", problemId);

      setProblems((prev) =>
        prev.map((p) =>
          p.id === problemId ? { ...p, solutions: (p.solutions || 0) + 1 } : p
        )
      );
    } else {
      alert("Failed to add solution!");
    }
    console.log("Submitting solution for problem:", problemId);

  };

  const categories = [
    { id: "all", name: "All Issues", icon: "🌍" },
    { id: "roads", name: "Roads", icon: "🚧" },
    { id: "water", name: "Water", icon: "💧" },
    { id: "waste", name: "Waste", icon: "🗑️" },
    { id: "electricity", name: "Electricity", icon: "⚡" },
  ];

  const filteredProblems =
    selectedCategory === "all"
      ? problems
      : problems.filter((p) => p.category === selectedCategory);

  const stats = [
    {
      label: "Active Problems",
      value: problems.length,
      icon: AlertCircle,
      color: "text-red-600",
    },
    {
      label: "Total Solutions",
      value: problems.reduce((sum, p) => sum + (p.solutions || 0), 0),
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Community Votes",
      value: problems.reduce((sum, p) => sum + (p.votes || 0), 0),
      icon: ThumbsUp,
      color: "text-green-600",
    },
    {
      label: "Problems Solved",
      value: problems.filter((p) => p.status === "solved").length,
      icon: TrendingUp,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* HEADER */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between">
          
            <div className="flex items-center gap-3">
                    <img 
                      src={samadhanLogo} 
                      alt="Samadhan Logo" 
                      className="h-22 w-auto"
                    />
              
            
            <div>
              <h1 className="text-2xl font-bold">SAMADHAN</h1>
              <p className="text-sm text-gray-600">-Bridging citizens, government, and NGOs for real change.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSubmitForm(!showSubmitForm)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold"
          >
            + Report Problem
          </button>
        </div>
      </header>

      {/* STATS */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              <s.icon className={s.color} size={30} />
            </div>
          </div>
        ))}
      </div>

      {/* CATEGORY FILTER */}
      <div className="max-w-7xl mx-auto px-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow border">
          <div className="flex gap-3 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedCategory === cat.id ? "bg-blue-600 text-white" : "bg-gray-100"
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUBMIT FORM */}
      {showSubmitForm && (
        <div className="max-w-3xl mx-auto px-4 mb-6 bg-white p-6 rounded-xl shadow border">
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            >
              {categories.filter((c) => c.id !== "all").map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border px-3 py-2 rounded-lg"
            />
            <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
                      onClick={() => document.getElementById("fileInput").click()}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="h-40 w-full object-cover rounded-lg mx-auto"
                        />
                      ) : (
                        <p className="text-gray-500">Click to upload an image or drag it here</p>
                      )}
                    </div>
                    <input
                      type="file"
                      id="fileInput"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setImageFile(file);
                        setPreviewUrl(URL.createObjectURL(file));
                      }}
                      required
                    />

            

            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold"
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Submit Problem"}
            </button>

            {uploading && (
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </form>
        </div>
      )}

      {/* PROBLEMS LIST */}
      <div className="max-w-7xl mx-auto px-4 space-y-4">
        {filteredProblems.length === 0 && (
          <p className="text-center text-gray-500">No problems found</p>
        )}

        {filteredProblems.map((problem) => (
          <div
            key={problem.id}
            className="bg-white p-6 rounded-xl shadow border flex gap-4"
          >
            <div className="w-32 h-32 flex-shrink-0">
              {problem.image && (
                <img
                  src={problem.image}
                  alt={problem.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="text-lg font-bold">{problem.title}</h3>
                <span
                        onClick={() =>
                          handleToggleStatus(problem.id, problem.status || "active")
                        }
                        className={`text-sm px-3 py-1 rounded-full cursor-pointer font-semibold transition ${
                          problem.status === "solved"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                        title="Click to change status"
                      >
                        {problem.status === "solved" ? "Solved ✔" : "Active"}
                      </span>

              </div>
              <p className="text-gray-600 mb-3">{problem.description}</p>
              <div className="text-sm text-gray-500 flex gap-3 mb-3">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {problem.location}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpvote(problem.id, problem.votes || 0)}
                  className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg"
                >
                  <ThumbsUp size={16} />
                  {problem.votes || 0}
                </button>
                <button
                    onClick={() =>
                      handleDownvote(problem.id, problem.downvotes || 0)
                    }
                    className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg"
                    title="Community is unhappy"
                  >
                    👎 {problem.downvotes || 0}
                  </button>


                {/* COMMENT ICON */}
                <div
                  className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-600 px-3 py-1 rounded-lg cursor-pointer"
                  onClick={() =>
                    setActiveCommentId(
                      activeCommentId === problem.id ? null : problem.id
                    )
                  }
                >
                  <MessageSquare size={16} />
                  {problem.solutions || 0}
                </div>
              </div>

              {/* COMMENT FORM + EXISTING SOLUTIONS */}
              {activeCommentId === problem.id && (
                <div className="mt-2 space-y-2">

                <input
                    type="text"
                    placeholder="Your name"
                    value={solutionName}
                    onChange={(e) => setSolutionName(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                  />
                  <textarea
                    value={newSolution}
                    onChange={(e) => setNewSolution(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                    placeholder="Add your solution..."
                  />
                  <button
                    onClick={() => handleAddSolution(problem.id)}
                    className="mt-1 bg-blue-600 text-white px-3 py-1 rounded-lg"
                  >
                    Submit
                  </button>

                  {/* Existing solutions */}
                  {(problemSolutions[problem.id] || []).map((s) => (
                    <div
                      key={s.id}
                      className="border p-2 rounded-lg bg-gray-50"
                    >
                      <p className="text-sm text-gray-600">{s.user_name}</p>
                      <p>{s.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white mt-12 py-6 text-center">
        <p className="text-gray-400">
          Empowering communities through collaboration
        </p>
      </footer>
    </div>
  );
};

export default CommunityProblemSolver;
