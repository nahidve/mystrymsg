import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/options'
import dbConnect from '@/lib/dbConnect'
import UserModel from '@/models/user.model'
import { User } from 'next-auth'
import mongoose from 'mongoose'

export async function GET(request: Request) {
    await dbConnect()
    const session = await getServerSession(authOptions)

    const user: User = session?.user as User
    if (!session || !session.user) {
        return Response.json(
            {
                success: false,
                message: "Unauthorized access! Please login to continue.",
            },
            { status: 401 },
        )
    }

    // Convert the user ID to a MongoDB ObjectId
    const userId = new mongoose.Types.ObjectId(user._id)
    try {
        // AGGREGATION in MongoDB to get the messages of the user sorted by createdAt in descending order
        const user = await UserModel.aggregate([
            { $match: { _id: userId } },
            { $unwind: { path: '$messages', preserveNullAndEmptyArrays: true } },
            { $sort: { 'messages.createdAt': -1 } },
            { $group: { _id: '$_id', messages: { $push: '$messages' } } }
        ])
        if (!user || user.length === 0) {
            return Response.json(
                {
                    success: false,
                    message: "No messages found for the user.",
                },
                { status: 404 },
            )
        }
        // Return the messages in the response
        return Response.json(
            {
                success: true,
                messages: user[0].messages,
            },
            { status: 200 },
        )

    } catch (error) {
        console.error("Error fetching messages:", error)
        return Response.json(
            {
                success: false,
                message: "Failed to fetch messages.",
            },
            { status: 500 },
        )
    }
}