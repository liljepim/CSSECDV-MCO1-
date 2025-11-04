const express = require('express');
const router = express.Router();
const Resto = require('../models/Resto');
const Review = require('../models/Review');
const User = require('../models/User');
const Sessions = require('../models/Session');
const passport = require('passport');
const multer = require('multer')
const fs = require('fs');
const e = require('express');
const bcrypt = require('bcrypt');
const { ensureAuthenticated } = require('./authcheck.js')
require('../config/passport.js')
//const insertusers = require('./insert.js')

// router.use(async (req,res,next) => {
//   console.log(req.session);
//   const sessId = req.sessionID
//   console.log(sessId)
//   console.log(sessId.length);
//   // currId = ObjectId(req.sessionID)
//   // console.log(typeof(req.sessionID))
//   try{
//     const sessionData = req.sessionStore.get(sessId, (err, session) => {
//       console.log(session)
//     })
//     console.log(sessionData)
//   } catch(error){
//     console.log(error)
//   }
//   //onsole.log(resSesh)
//   next();
// })

router.use((req,res,next)=>{
  // console.log(req.user)
  console.log(req.session.cookie)
  // console.log(req)
  // console.log(req.isAuthenticated())
  next()
})

const storage = multer.diskStorage({
  destination: function(req, res, cb) {
    cb(null, './public/img')
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({
  storage: storage,
}).single('image')

router.get('', async (req, res) => {
    res.render('index', {css: ['styles'], user: req.user})
})

router.get('/restos', ensureAuthenticated, async (req, res) => {
    const restos = await Resto.find({}).sort({restoID: 1});

    res.render('restos', {css: ['styles2'], restos, user: req.user})
})

router.get('/restoreviews/:idResto', async (req, res) => {
        const id = req.params.idResto


        const resto = await Resto.findOne({ restoID: id });
        const reviews = await Review.find({ restoID: id });
        const users = await User.find({});


        // Add userName and userImage from users to reviews based on userID
        for (let i = 0; i < reviews.length; i++) {
            for (let j = 0; j < users.length; j++) {
                if (reviews[i].userID == users[j].userID) {
                    reviews[i].userName = users[j].userName;
                    reviews[i].userImage = users[j].userImage;
                }
            }
        }

        var reviewIndex = 1;
        // Assign an index to each review
        for (let i = 0; i < reviews.length; i++) {
            reviews[i].reviewIndex = reviewIndex;
            reviewIndex++;
        }

        
        res.render('restoreviews', { css: ['styles2'], resto, reviews, user: req.user});
   
})

router.get('/reviewdetails/:idReview', async (req, res) => {
  const id = req.params.idReview;
  const review = await Review.findOne({ reviewID: id });

  // Add userName and userImage from users to reviews based on userID
  const reviewUser = await User.findOne({ userID: review.userID });
  const currentUser = req.user || null; // Assign null if req.user is undefined or falsy

  var isLoggedIn = false;
  if (currentUser && typeof currentUser === 'object' && Object.keys(currentUser).length > 0) { // Check if currentUser is an object and not empty and has properties
    isLoggedIn = true;
  }

  let interaction = null;
  let interactionCode = 0; // 0 - Not interacted, 1 - Helpful, 2 - Not Helpful

  // Check if there is an interaction
  if (currentUser && currentUser.userID) { // Only check for interaction if currentUser has a userID
    interaction = await review.interactions.find((interaction) => interaction.userId === currentUser.userID);
    if (interaction) {
      interactionCode = interaction.helpful ? 1 : 2;
    }
  }

  let isOwner = false;

  // Check if the current user is the owner of the establishment
  if (currentUser && currentUser.isEstablishmentOwner && currentUser.establishmentID === review.restoID) {
    console.log('Current user is the owner of the establishment');
    isOwner = true;
  }

  const hasNoResponses = review.responses.length === 0;

  res.render('reviewdetails', {
    css: ['styles2'],
    review,
    reviewUser,
    user: currentUser,
    interactionCode,
    isOwner,
    hasNoResponses,
    isLoggedIn
  });
});

router.get('/tastetrek', async (req, res) => {
    res.render('tastetrek', { css: ['styles2'], user: req.user});
})

router.get('/tastetrek/randomresto', async (req, res) => {
    const restos = await Resto.find({});
    const randomResto = restos[Math.floor(Math.random() * restos.length)];

    res.render('tastetrekresult', { css: ['styles2'], randomResto, user: req.user});
})


router.get('/compose/:idResto', async (req, res) => {
    const id = req.params.idResto;
    const resto = await Resto.findOne
    ({ restoID: id });
    res.render('compose', { css: ['styles2'], resto, user: req.user});

})

router.get('/viewacc/:currentUserID', async (req, res) => {
	const currentUserID = req.params.currentUserID
	const currentUser = await User.findOne({ userID: currentUserID })
	var currentUserReviewsTemp = await Review.find({ userID: currentUserID })
	const currentUserReviews = currentUserReviewsTemp.slice(0, 3)
	res.render('viewacc', { css: ['styles_g', 'styles2'], currentUser, currentUserReviews, user: req.user })
})

router.get('/viewfullreviews/:currentUserID', async (req, res) => {
	const currentUserID = req.params.currentUserID 
	const currentUser = await User.findOne({ userID: currentUserID })
	const currentUserReviews = await Review.find({ userID: currentUserID })
	/*
	const currentUserResponses = await Review.find(
		{ 
			responses: {
				$elemMatch:
				{
					ownerID: currentUserID
				}
			} 
		}, 
		{ responses: 1 }
	)
	*/
	//currentUserResponses = tempCurrentUserResponses.filter((v) => v.ownerID.startsWith(currentUserID))
	//console.log(currentUserResponses)
	/*
	for(let i = 0; i < tempCurrentUserResponses.length; i++)
	{
		console.log(tempCurrentUserResponses[i])
		if(tempCurrentUserResponses[i].ownerID == currentUserID)
			currentUserResponses.push(tempCurrentUserResponses[i])
	}
	*/
	const currentUserResponses = await Review.aggregate([
		{ $unwind: "$responses" },
		{ $replaceRoot: { newRoot: "$responses" } }
	])
	console.log(currentUserResponses)
	res.render('viewfullreviews', { css: ['styles_g', 'styles2'], currentUser, currentUserReviews, currentUserResponses, user: req.user })
})

router.get('/editlogout/:currentUserID', async (req, res) => {
	const currentUserID = req.params.currentUserID
	const currentUser = await User.findOne({ userID: currentUserID })
	const currentUserReviewCount = (await Review.find({ userID: currentUserID })).length
	res.render('editlogout', { css: ['styles_g', 'styles2'], currentUser, currentUserReviewCount, user: req.user })
})

router.post('/editprofile/:currentUserID', upload, async (req, res) => {
	try
	{
		const currentUserID = req.params.currentUserID
		const { userName, userPassword, userDesc, fileInput } = req.body
		let filename = ""
		    
		if(fileInput)
			filename = "/img/" + fileInput
		
		const generatedPassword = await generatePassword(userPassword)
		const user = await User.findOneAndUpdate(
			{ userID: currentUserID },
			{
				userName: userName,
				userPassword: generatedPassword,
				userDesc: userDesc,
				userImage: filename
			},
			{ new: true }
		)
		console.log(filename)

		res.redirect('/editlogout/' + currentUserID)
	}
	catch(error)
	{
		console.error(error)
		res.status(500).send('Error editing profile')
	}
})

async function generatePassword(userPassword)
{
	const hashedPassword = await new Promise((resolve, reject) => {
		bcrypt.genSalt(10, (err, salt) => {
			genSalt = salt
			bcrypt.hash(userPassword, salt, (err, hash) => {
				if (err) reject (err)
				resolve(hash)
			})
		})
	})
	
	return hashedPassword
}

router.get('/editreview/:idReview', async (req, res) => {
    const id = req.params.idReview
    const review = await Review.findOne({ reviewID: id })
    const resto = await Resto.findOne({ restoID: review.restoID })
    res.render('editreview', { css: ['styles2'], review, resto, user: req.user })
})



router.get('/search', async (req, res) => {
    try{
        const locals =  {
            title: 'Search Results'
        };

        let searchText = req.query.searchText;
        const removeSpecialChar = searchText.replace(/[^a-zA-Z0-9_ -]/,'')
        console.log(searchText)
        let rating = req.query.rating || null
        let ratingw = null
        let ratingm = null
        let ratingl = null
        let restos = await Resto.find({
            $or: [
                {restoName: { $regex: new RegExp(removeSpecialChar, 'i')}},
                {restoDesc: { $regex: new RegExp(removeSpecialChar, 'i')}}
            ]
        })
        if(rating !== null){
          restos = restos.filter(resto => resto.aveRating=== rating)
        }
        
        console.log(restos)
        if(rating === 'W'){
          ratingw = true
        }
        if(rating === 'M'){
          ratingm = true
        }
        if(rating === 'L'){
          ratingl = true
        }

        res.render("search", {
            css: ['styles2_j', 'styles2'],
            restos,
            searchText, 
            user: req.user,
            ratingw,
            ratingm,
            ratingl
        })
        


    } catch (error) {
        console.log(error);
    }
})

router.post('/reviews/helpful', async (req, res) => {
    console.log('POST /reviews/helpful route hit');
 
    try {
        const { reviewId, userId, helpful } = req.body;
        console.log('reviewId:', reviewId);
        console.log('userId:', userId);
        console.log('helpful:', helpful);
    
        // Find the review and update the helpful/not helpful count
        const review = await Review.findOne({ reviewID: reviewId });
        console.log('Review found:', review);

      if (!review) {
        return res.status(404).json({ message: 'Review not found' });
      }
  
      // Check if the user has already interacted with this review
      const userInteraction = review.interactions.find((interaction) => interaction.userId === userId);
  
      if (userInteraction) {
        // User has already interacted, update the existing interaction
        if (userInteraction.helpful !== helpful) {
          if (helpful) {
            review.helpfulCount += 1;
            review.notHelpfulCount -= 1;
          } else {
            review.helpfulCount -= 1;
            review.notHelpfulCount += 1;
          }
          userInteraction.helpful = helpful;
        }
      } else {
        // New interaction, add it to the interactions array
        review.interactions.push({ userId, helpful });
        if (helpful) {
          review.helpfulCount += 1;
        } else {
          review.notHelpfulCount += 1;
        }
      }
  
      await review.save();
      const updatedReview = await Review.findOne({ reviewID: reviewId });

        console.log('Review updated successfully');
        res.json({ message: 'Review updated', updatedReview });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
    
  });

router.post('/reviews/removehelpful', async (req, res) => {
    //Remove Interaction based on given review and userID
    console.log('POST /reviews/removehelpful route hit');

    try {
        const { reviewId, userId } = req.body;
        console.log('reviewId:', reviewId);
        console.log('userId:', userId);

        const review = await Review.findOne({ reviewID: reviewId });
        console.log('Review found:', review);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        //Remove Interaction
        const index = review.interactions.findIndex((interaction) => interaction.userId === userId);
        if (index !== -1) {
             // Update the helpful/not helpful count
             if (review.interactions[index].helpful) {
                review.helpfulCount -= 1;
             } else {
                review.notHelpfulCount -= 1;
             }
             
            review.interactions.splice(index, 1); // Remove the interaction
           
            await review.save();
            const updatedReview = await Review.findOne({ reviewID: reviewId });
            console.log('Review updated successfully');
            res.json({ message: 'Review updated', updatedReview });
        } else {
            console.log('User has not interacted with this review');
            res.json({ message: 'User has not interacted with this review' });
        } 
        }catch (error) {
            console.error(error);
        }
});

async function generateReviewID() {
    try {
      // Find the last review in the database and sort them in descending order by reviewID
      const lastReview = await Review.findOne().sort({ reviewID: -1 });
  
      // If there are no reviews in the database, start with reviewID 1
      if (!lastReview) {
        return 1;
      }
  
      // Increment the last reviewID by 1
      return lastReview.reviewID + 1;
    } catch (error) {
      console.error('Error generating review ID:', error);
      throw error;
    }
  }

function formatDate(dateString) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = new Date(dateString);

    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month} ${day}, ${year}`;
}

router.post('/submit-review', async (req, res) => {
  try {
    const { reviewTitle, reviewContent, reviewRating } = req.body;
    const reviewID = await generateReviewID(); // Generate unique review ID
    const originalDate = new Date().toISOString();
    const review = new Review({
      reviewID,
      userID: req.user.userID, // You need to provide userID in the form or fetch it from somewhere
      restoID: req.body.restoID, // You need to provide restoID in the form or fetch it from somewhere
      reviewTitle,
      reviewContent,
      
      reviewDate: formatDate(originalDate),
      reviewRating,
    });
    await review.save();
    res.redirect('/restoreviews/' + req.body.restoID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error submitting review');
  }
});


router.post('/edit-review/:reviewID', async (req, res) => {
  try {
    const reviewID = req.params.reviewID;
    const { reviewTitle, reviewContent, reviewRating, isEdited} = req.body;
    
    // Assuming you have a Review model defined
    const review = await Review.findOneAndUpdate(
      { reviewID: reviewID }, // Query to find the review by its ID
      {
        reviewTitle: reviewTitle,
        reviewContent: reviewContent,
        reviewRating: reviewRating,
        isEdited: isEdited // Set isEdited to true
      },
      { new: true } // To return the updated review
    );

    if (!review) {
      return res.status(404).send('Review not found');
    }
    
    res.redirect('/restoreviews/' + review.restoID);
    console.log(review);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error editing review');
  }
});

router.get('/delete-review/:reviewID', async (req, res) => {
  try {
    const reviewID = req.params.reviewID;
    const userID = req.user.userID;
    // Delete the review from the database based on the review ID
    await Review.deleteOne({ reviewID: reviewID });
    res.redirect('/viewfullreviews/' + userID);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error deleting review');
  }
});

router.post('/reviews/respond', async (req, res) => {
    console.log('POST /reviews/respond route hit');
    try {
        const { reviewId, responseContent, ownerId } = req.body;
        console.log('reviewId:', reviewId);
        console.log('responseContent:', responseContent);
        console.log('ownerId:', ownerId);

        const review = await Review.findOne({ reviewID: reviewId });
        console.log('Review found:', review);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Get date today in the format 'MMM DD, YYYY'
        const originalDate = new Date().toISOString();
        const responseDate = formatDate(originalDate);
        console.log('Response date:', responseDate);

        // Add the response to the review
        review.responses.push({
            responseContent,
            responseDate: responseDate,
            ownerID: ownerId
        });
       
        await review.save();
        const updatedReview = await Review.findOne({ reviewID: reviewId });
        const latestResponse = updatedReview.responses[updatedReview.responses.length - 1];

        console.log('Review updated successfully');
        res.json({ message: 'Review updated', latestResponse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});



/** 
 * ROUTE TEMPLATE
 * Changes:
 * 1. Add file to views with .hbs extension
 * 2. Change all path from images/{file} to /img/{file}
 * 3. Remove .html for all hrefs
 * 4. set route equal to filename
 * 5. set res.render('filename') to hbs filename
 * */ 

// app.get('/{request(basically filename din)}', (req, res) => {
//     res.render('{filename}.hbs', {layout: 'loginregister', css: 'styles_j'})
// })

module.exports = router;
