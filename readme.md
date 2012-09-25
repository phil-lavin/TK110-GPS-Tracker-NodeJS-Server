TK110 GPS Tracker NodeJS Server
===============================

Intro
-----

This is GPS tracker for written in NodeJS for TK110 GPS Tracker and similar tracker devices. It's sort of designed to be used out of the box but is mostly to give
you an idea of the protocols for use in your own code.

Requirements
------------

* NodeJS
* MySQL Module

Features
--------

* Capture of streaming content
* Logging to database
* Auto calculation of distance moved between points
* Update of point when tracker is stationary to avoid mass duplication of data
* Fully configurable via config

Installation
------------



Running
-------

* cd into the clone directory
* node tracker.js

Output
------

You will see output when a tracker device connects, when a new point is logged and an existing point is updated (because the tracker is stationary).
