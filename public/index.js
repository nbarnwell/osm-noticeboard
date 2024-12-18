import IndexViewModel from './IndexViewModel.js'

document.addEventListener("DOMContentLoaded", function () {
  ko.applyBindings(new IndexViewModel());
});