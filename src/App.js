import { useRef, useState, useEffect } from "react";
import { Layer, Line, Stage, Image as RKImage } from "react-konva";
import { Button } from "@mui/material";
import { DropzoneDialog } from "react-mui-dropzone"
import { Mask } from "konva/lib/filters/Mask";

const cv = window.cv

const App = () => {
  const [isOpen, setOpen] = useState(false)

  const [image, setImage] = useState()
  const [scale, setScale] = useState(1.0)

  const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [tool, setTool] = useState('pen')
  const [lines, setLines] = useState([])
  const isDrawing = useRef(false)

  const raw_image = useRef()

  const handleMouseDown = (e) => {
    isDrawing.current = true
    const pos = e.target.getStage().getPointerPosition()
    setLines([...lines, { tool, points: [pos.x, pos.y] }])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing.current) {
      return
    }

    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    let lastLine = lines[lines.length - 1]

    lastLine.points = lastLine.points.concat([point.x, point.y])

    lines.splice(lines.length - 1, 1, lastLine)
    setLines(lines.concat())
  }

  const handleMouseUp = () => {
    isDrawing.current = false
  }

  return (
    <div>
      <Button
        variant="contained"
        onClick={() => {
          setOpen(true)
        }}>Open</Button>

      <Button
        variant="contained"
        onClick={async () => {
          // console.log(lines)
          // mask_image.current = cv.Mat.zeros(raw_image.current.rows, raw_image.current.cols, raw_image.current.type())

          const src = new cv.Mat()
          cv.cvtColor(raw_image.current, src, cv.COLOR_RGBA2RGB, 0)

          // const _mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8U)

          const _mask = new cv.Mat(
            src.rows,
            src.cols,
            cv.CV_8UC1,
            new cv.Scalar(cv.GC_PR_BGD))

          let rect = new cv.Rect()
          let bgdModel = new cv.Mat()
          let fgdModel = new cv.Mat()

          lines.forEach(line => {
            for (let i = 0; i < line.points.length - 2; i += 2) {
              const x1 = Math.floor(line.points[i])
              const y1 = Math.floor(line.points[i + 1])
              const x2 = Math.floor(line.points[i + 2])
              const y2 = Math.floor(line.points[i + 3])
              // console.log(x,y)
              // _mask.ucharPtr(y, x)[0] = 255
              // _mask.ucharPtr(y, x)[1] = 255
              // _mask.ucharPtr(y, x)[2] = 255
              cv.line(_mask,
                new cv.Point(x1, y1),
                new cv.Point(x2, y2),
                new cv.Scalar(cv.GC_FGD),
                5,
                cv.LINE_AA)
            }
          })

          await cv.grabCut(src, _mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_MASK)

          for (let i = 0; i < src.rows; i++) {
            for (let j = 0; j < src.cols; j++) {
              if (_mask.ucharPtr(i, j)[0] == 0 || _mask.ucharPtr(i, j)[0] == 2) {
                src.ucharPtr(i, j)[0] = 0;
                src.ucharPtr(i, j)[1] = 0;
                src.ucharPtr(i, j)[2] = 0;
              }
            }
          }

          cv.imshow('output', src)
          src.delete()

        }}>
        GrabCut
      </Button>

      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}>

        <Layer>
          <RKImage
            image={image}
            scaleX={scale}
            scaleY={scale} />
        </Layer>

        <Layer>
          {lines.map((line, i) => {
            return (
              <Line
                key={i}
                points={line.points}
                stroke="#df4b26"
                strokeWidth={5}
                tension={0.1}
                lineCap="round"
                lineJoin="round"
              />
            )
          })}
        </Layer>
      </Stage>

      <canvas id="output" />

      <DropzoneDialog
        open={isOpen}
        acceptedFiles={['image/jpg', 'image/jpeg', 'image/png']}
        filesLimit={1}
        maxFileSize={50000000}
        onClose={() => {
          setOpen(false)
        }}
        onSave={(files) => {
          // console.log(files)
          const _img = new Image()
          _img.src = URL.createObjectURL(files[0])
          _img.onload = () => {
            setStageSize({ width: _img.naturalWidth, height: _img.naturalHeight })
            setImage(_img)
            raw_image.current = cv.imread(_img)
          }
          setOpen(false)
        }}
      />
    </div>
  );
}

export default App;
