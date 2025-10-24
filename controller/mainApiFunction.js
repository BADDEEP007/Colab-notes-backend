import { firestore } from "../utils/firebase.js";
import { getNotebyid } from "../middleware/HelperApiFunction.js";
export const getallnotes = async (req, res) => {
  try {
    // Get notes for the authenticated user only
    const userId = req.user.id;
    
    const notesCollection = firestore.collection("Notes");
    const notesSnapshot = await notesCollection
      .where("Created_by", "==", userId)
      .orderBy("Created_on", "desc")
      .get();

    const userNotes = notesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      status: "success",
      data: {
        notes: userNotes,
        count: userNotes.length,
        user: {
          id: req.user.id,
          username: req.user.username
        }
      }
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

export const postnotes = async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;
    
    // Check if user already has a note with this title
    const existingNote = await firestore.collection("Notes")
      .where("title", "==", title)
      .where("Created_by", "==", userId)
      .limit(1)
      .get();
    
    if (!existingNote.empty) {
      return res.status(409).json({
        status: "error",
        message: "You already have a note with this title",
        code: "DUPLICATE_TITLE"
      });
    }
     
    const newNote = {
      title,
      content,
      Created_by: userId,
      Created_by_username: req.user.username,
      Created_on: new Date().toISOString(),
      Updated_on: new Date().toISOString()
    };
    
    const docRef = await firestore.collection("Notes").add(newNote);
    
    res.status(201).json({
      status: "success",
      message: "Note created successfully",
      data: {
        note: { id: docRef.id, ...newNote }
      }
    });
  } catch (error) {
    console.error("Error adding note:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message 
    });
  }
};

export const DeleteNotebyTitle = async (req, res) => {  
  try {
    const title = req.query.title || req.query.Title;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ 
        status: "error",
        message: "Title is required" 
      });
    }   

    // Find the note that belongs to the authenticated user
    const noteQuery = await firestore.collection("Notes")
      .where("title", "==", title)
      .where("Created_by", "==", userId)
      .limit(1)
      .get();

    if (noteQuery.empty) {
      return res.status(404).json({ 
        status: "error",
        message: "Note not found or you don't have permission to delete it" 
      });
    }

    const noteDoc = noteQuery.docs[0];
    await noteDoc.ref.delete();

    res.status(200).json({
      status: "success",
      message: "Note deleted successfully",
      data: {
        deletedNote: {
          id: noteDoc.id,
          title: title
        }
      }
    });
    
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

export const getNotebyTitle = async (req, res) => {
  try {
    const title = req.params.title || req.params.Title;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ 
        status: "error",
        message: "Title is required" 
      });
    }

    // Find note that belongs to the authenticated user
    const notesCollection = firestore.collection("Notes");
    const querySnapshot = await notesCollection
      .where("title", "==", title)
      .where("Created_by", "==", userId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ 
        status: "error",
        message: "Note not found or you don't have permission to view it" 
      });
    }

    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      status: "success",
      data: {
        notes,
        user: {
          id: req.user.id,
          username: req.user.username
        }
      }
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message 
    });
  }
};

export const updateNote = async (req, res) => {
  try {
    const titleToUpdate = req.params.title || req.params.Title;
    const userId = req.user.id;
    
    if (!titleToUpdate) {
      return res.status(400).json({ 
        status: "error",
        message: "Title parameter is required" 
      });
    }
    
    const updateData = {};
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.content !== undefined) updateData.content = req.body.content;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        status: "error",
        message: 'No update fields provided' 
      });
    }

    // Add updated timestamp
    updateData.Updated_on = new Date().toISOString();

    // Find note that belongs to the authenticated user
    const noteQuery = await firestore.collection("Notes")
      .where("title", "==", titleToUpdate)
      .where("Created_by", "==", userId)
      .limit(1)
      .get();

    if (noteQuery.empty) {
      return res.status(404).json({ 
        status: "error",
        message: 'Note not found or you don\'t have permission to update it' 
      });
    }

    // If updating title, check for duplicates
    if (updateData.title && updateData.title !== titleToUpdate) {
      const duplicateCheck = await firestore.collection("Notes")
        .where("title", "==", updateData.title)
        .where("Created_by", "==", userId)
        .limit(1)
        .get();
      
      if (!duplicateCheck.empty) {
        return res.status(409).json({
          status: "error",
          message: "You already have a note with this title",
          code: "DUPLICATE_TITLE"
        });
      }
    }

    const docRef = noteQuery.docs[0].ref;
    await docRef.update(updateData);

    // Get updated document
    const updatedDoc = await docRef.get();

    res.status(200).json({
      status: "success",
      message: "Note updated successfully",
      data: {
        note: {
          id: updatedDoc.id,
          ...updatedDoc.data()
        }
      }
    });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ 
      status: "error",
      message: error.message 
    });
  }
};