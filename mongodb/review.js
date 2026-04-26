if (body.reviews) {
      const reviewsCount = Array.isArray(body.reviews) ? body.reviews.length : 0;
      for (let i = 0; i < reviewsCount; i++) {
        const reviewObj = {
          name: body[`reviews[${i}][name]`],
          comment: body[`reviews[${i}][comment]`],
          salerComment: body[`reviews[${i}][salerComment]`],
          date: body[`reviews[${i}][date]`],
          rating: Number(body[`reviews[${i}][rating]`]),
          imageUrl: [],
        };

        const reviewFiles = files.filter(f => f.fieldname.startsWith(`reviews[${i}][image]`));
        for (const f of reviewFiles) {
          const url = await uploadToCloudinary(f.buffer);
          reviewObj.imageUrl.push(url);
        }

        reviews.push(reviewObj);
      }
    }