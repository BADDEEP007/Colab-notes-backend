import { 
  createUser, 
  getUserById, 
  getUserByEmail, 
  getAllUsers, 
  updateUser, 
  deleteUser, 
  getUserStats 
} from '../postgresql/Postgresql.js';

// Create new user
export const createNewUser = async (req, res) => {
  try {
    const { username, gmail, password, refreshToken, accessToken } = req.body;

    if (!username || !gmail) {
      return res.status(400).json({
        status: "error",
        message: "Username and email are required"
      });
    }

    const userData = {
      username,
      gmail,
      password,
      refreshToken,
      accessToken
    };

    const newUser = await createUser(userData);

    res.status(201).json({
      status: "success",
      message: "User created successfully",
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          gmail: newUser.gmail,
          created_at: newUser.created_at
        }
      }
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to create user"
    });
  }
};

// Get user by ID
export const getUserByIdController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required"
      });
    }

    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          username: user.username,
          gmail: user.gmail,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user"
    });
  }
};

// Get user by email
export const getUserByEmailController = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required"
      });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.json({
      status: "success",
      data: {
        user: {
          id: user.id,
          username: user.username,
          gmail: user.gmail,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user"
    });
  }
};

// Get all users with pagination
export const getAllUsersController = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    if (limit > 100) {
      return res.status(400).json({
        status: "error",
        message: "Limit cannot exceed 100"
      });
    }

    const users = await getAllUsers(limit, offset);

    res.json({
      status: "success",
      data: {
        users,
        pagination: {
          limit,
          offset,
          count: users.length
        }
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch users"
    });
  }
};

// Update user
export const updateUserController = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required"
      });
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields provided for update"
      });
    }

    const updatedUser = await updateUser(id, updateFields);

    res.json({
      status: "success",
      message: "User updated successfully",
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          gmail: updatedUser.gmail,
          updated_at: updatedUser.updated_at
        }
      }
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update user"
    });
  }
};

// Delete user
export const deleteUserController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required"
      });
    }

    const deletedUser = await deleteUser(id);

    res.json({
      status: "success",
      message: "User deleted successfully",
      data: {
        deletedUser: {
          id: deletedUser.id,
          username: deletedUser.username,
          gmail: deletedUser.gmail
        }
      }
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to delete user"
    });
  }
};

// Get user statistics
export const getUserStatsController = async (req, res) => {
  try {
    const stats = await getUserStats();

    res.json({
      status: "success",
      data: {
        stats: {
          totalUsers: parseInt(stats.total_users),
          usersToday: parseInt(stats.users_today),
          usersThisWeek: parseInt(stats.users_this_week)
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch user statistics"
    });
  }
};