const video = document.getElementById('video');
const showDetections = document.getElementById('showDetections');
const showFaceLandmarks = document.getElementById('showFaceLandmarks');
const showFaceExpression = document.getElementById('showFaceExpression');
const showAgeAndGender = document.getElementById('showAgeAndGender');
const imageUpload = document.getElementById('imageUpload');
const switchButton = document.getElementById('switchCamera');

document.querySelector('.warning').innerText = "Loading....";
switchButton.disabled = true;
let dec = false;
let face = false;
let expr = false;
let age = false;
isImage = false;
let image;
let canvas;

switchButton.addEventListener('click', function(){
  isImage = !isImage;
  if(isImage){
  document.querySelector('.videoContainer').removeChild(video);
  document.querySelector('.videoContainer').appendChild(image);

  }else if(!isImage){
    document.querySelector('.videoContainer').removeChild(image);
    document.querySelector('.videoContainer').appendChild(video);
    video.play();
    
  }
})
showDetections.addEventListener('click', function () {
  dec = !dec;
})
showFaceLandmarks.addEventListener('click', function () {
  face = !face;
})
showFaceExpression.addEventListener('click', function () {
  expr = !expr;
})
showAgeAndGender.addEventListener('click', function () {
  age = !age;
})

//jer se asinhrono izvrsava mora se promise odraditi
Promise.all([
    //pozivamo modele faceaopi 
    //tinyFace je mnogo brzi i moze se koristit za streamovanje
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    //registruje razlicite djelove lica
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    //omogucava api da prepozna gde je lice 
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    //prepoznaje izraze lica 
    faceapi.nets.faceExpressionNet.loadFromUri('/models'),
    //godine / pol 
    faceapi.nets.ageGenderNet.loadFromUri('/models'),

    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
  ])
  .then(startVideo)

function startVideo() {
  navigator.getUserMedia({
      video: {}
    },
    //sta uzima, u ovom slucaju uzima stream kamere
    stream => video.srcObject = stream,
    err => console.error(err)
  )
}



  imageUpload.addEventListener('change', async ()=>{
     image = await faceapi.bufferToImage(imageUpload.files[0]);
     canvas = faceapi.createCanvasFromMedia(image);
  });
  

video.addEventListener('play', function () {


  let canvas = faceapi.createCanvasFromMedia(video);
  document.body.querySelector('.videoContainer').appendChild(canvas);
  let  displaySize = {
    width: video.width,
    height: video.height
  }

  //spaja dimenzije canvasa i displaySize
  faceapi.matchDimensions(canvas, displaySize);
  //posto se stvari asinhrono izvrsavaju  mora se podesiti 
  //SetInterval izvrsava ovu funkciju vise puta posle 200ms


  setInterval(
    
    async function () {
      let detections;
      if(!image){
        switchButton.disabled = true;
      }else{
        switchButton.disabled = false;
      }
      // konstanta detections ceka odgovor od faceapi detectAllFaces metode 
      // prosledjujemo sta koristimo da bi detektovali (video) i koju biblioteku. Face landark prikazuje pokrete lica
      if(!isImage){
         detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withAgeAndGender();
         displaySize = {
          width: video.width,
          height: video.height
        }
        faceapi.matchDimensions(canvas, displaySize);
        } else {
        detections =  await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions().withAgeAndGender();
        displaySize = {
          width: image.width,
          height:image.height
        }
        faceapi.matchDimensions(canvas, displaySize);
      }
      //podesava da se prikaz detekcije za video element i canvas element
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      //resizedDetections[0].gender
      //stampanje elementa 

      
      let table = "<tr>" +
        "<th>Num</th>" +
        "<th>Age</th>" +
        "<th>Whole age value</th>" +
        "<th>Expression</th>" +
        "<th>Exp. Confidence</th>" +
        "<th>Gender</th>" +
        "<th>Gen. Confidence</th>" +
        "</tr>";

        if(Object.keys(resizedDetections).length === 0){
          document.querySelector('.warning').innerText  ="Can't find anyone";
          document.querySelector('.warning').style.color ="red";
        }
        else{
          document.querySelector('.warning').innerText  ="Found someone";
          document.querySelector('.warning').style.color ="green";
        resizedDetections.forEach( (element, index)=> {
        const nKeys = Object.values(element.expressions);
        const expVal = Object.keys(element.expressions);
        let max = 0;
        let expressionVal = "";
        for (i = 0; i < nKeys.length; i++) {
          max = (max < nKeys[i]) ? nKeys[i] : max;
          if (max === nKeys[i]) {
            expressionVal = expVal[i];
          }
        }

        table += '<tr>';
        table += '<td>' + (index + 1) + '</td>';
        table += '<td>' + Math.floor(element.age) + '</td>';
        table += '<td>' + element.age + '</td>';
        table += '<td>' + expressionVal + '</td>';
        table += '<td>' + Math.floor(max * 100) + '%' + '</td>';
        table += '<td>' + element.gender + '</td>';
        table += '<td>' + Math.floor(element.genderProbability * 100) + '%' + '</td>';
        table += '</tr>';
        document.getElementById("myTable").innerHTML = table;
      });


      //resetuje canvas cim zavrsi sa detekcijom
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);


      //crta detekciju
      // faceapi.draw.drawDetections(canvas, resizedDetections)

      if (dec === true) {
        faceapi.draw.drawDetections(canvas, resizedDetections);
      }
      //crta linije lica 
      if (face === true) {
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      }
      //crta izraze lica 
      if (expr === true) {
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      }
      //prikaz godina i pola

      if (age === true) {
        resizedDetections.forEach(detection => {
          const box = detection.detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, {
            label: Math.round(detection.age) + " year old, " + detection.gender
          })
          drawBox.draw(canvas);
        })

      }

    }
    }, 400);
});
