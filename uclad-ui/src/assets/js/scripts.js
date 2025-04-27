document.onreadystatechange = function () {
    if (document.readyState !== "complete") {
  document.querySelector(
      "body").style.visibility = "hidden";
  document.querySelector(
      ".spinner").style.visibility = "visible";
    } else {
  setTimeout(function() {
      document.querySelector(
    ".spinner").style.display = "none";
      document.querySelector(
    "body").style.visibility = "visible";
  }, 1000); // 1 second delay
    }
};
function showContent(contentType) {
  // Get the spinner element
  var spinner = document.getElementById('spinner');

  // Show the spinner
  if (spinner) {
      spinner.style.display = 'block';
  }

  // Hide all content divs
  var allContentDivs = document.querySelectorAll('.content');
  allContentDivs.forEach(function(div) {
      div.style.display = 'none';
  });

  // Simulate a delay (e.g., for loading content or animations)
  setTimeout(function() {
      // Hide the spinner
      if (spinner) {
          spinner.style.display = 'none';
      }

      // Show the selected content
      var selectedContentDiv = document.getElementById(contentType + 'Content');
      if (selectedContentDiv) {
          selectedContentDiv.style.display = 'block';
      }
  }, 500); // Adjust the delay time (in milliseconds) as needed
}